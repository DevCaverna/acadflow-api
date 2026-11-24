import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { isUniqueViolation } from '@/common/database/postgres-error';
import { ApiException } from '@/common/filters/api.exception';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import { StudentResponseDto } from '@/modules/enrollments/dto/student-response.dto';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { Grade } from '@/modules/grades/entities/grade.entity';
import { User } from '@/modules/users/entities/user.entity';

const MAX_CANDIDATES = 10;

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    private readonly disciplinesService: DisciplinesService,
  ) {}

  async findStudents({
    professorId,
    disciplineId,
  }: {
    professorId: string;
    disciplineId: string;
  }): Promise<StudentResponseDto[]> {
    await this.disciplinesService.findOwnedOrFail({ professorId, id: disciplineId });

    const students = await this.userRepository
      .createQueryBuilder('student')
      .innerJoin(
        Enrollment,
        'enrollment',
        'enrollment.studentId = student.id AND enrollment.disciplineId = :disciplineId',
        { disciplineId },
      )
      .orderBy('student.name', 'ASC')
      .addOrderBy('student.id', 'ASC')
      .getMany();

    return students.map((student) => StudentResponseDto.from(student));
  }

  async findCandidates({
    professorId,
    disciplineId,
    search,
  }: {
    professorId: string;
    disciplineId: string;
    search: string;
  }): Promise<StudentResponseDto[]> {
    await this.disciplinesService.findOwnedOrFail({ professorId, id: disciplineId });

    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    const students = await this.userRepository
      .createQueryBuilder('student')
      .leftJoin(
        Enrollment,
        'enrollment',
        'enrollment.studentId = student.id AND enrollment.disciplineId = :disciplineId',
        { disciplineId },
      )
      .where('student.role = :role', { role: 'ALUNO' })
      .andWhere('enrollment.studentId IS NULL')
      .andWhere(
        new Brackets((where) =>
          where
            .where('student.name ILIKE :pattern', { pattern })
            .orWhere('student.email ILIKE :pattern', { pattern }),
        ),
      )
      .orderBy('student.name', 'ASC')
      .addOrderBy('student.id', 'ASC')
      .take(MAX_CANDIDATES)
      .getMany();

    return students.map((student) => StudentResponseDto.from(student));
  }

  async enroll({
    professorId,
    disciplineId,
    studentId,
  }: {
    professorId: string;
    disciplineId: string;
    studentId: string;
  }): Promise<StudentResponseDto> {
    await this.disciplinesService.findOwnedOrFail({ professorId, id: disciplineId });
    const student = await this.userRepository.findOneBy({ id: studentId, role: 'ALUNO' });
    if (!student) throw new ApiException('NOT_FOUND');
    try {
      await this.enrollmentRepository.insert({ studentId, disciplineId });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) throw new ApiException('CONFLICT');
      throw error;
    }
    return StudentResponseDto.from(student);
  }

  async remove({
    professorId,
    disciplineId,
    studentId,
  }: {
    professorId: string;
    disciplineId: string;
    studentId: string;
  }): Promise<void> {
    await this.disciplinesService.findOwnedOrFail({ professorId, id: disciplineId });
    await this.enrollmentRepository.manager.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, {
        where: { studentId, disciplineId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!enrollment) throw new ApiException('NOT_FOUND');
      const hasGrades = await manager
        .createQueryBuilder(Grade, 'grade')
        .innerJoin(
          Activity,
          'activity',
          'activity.id = grade.activityId AND activity.disciplineId = :disciplineId',
          { disciplineId },
        )
        .where('grade.studentId = :studentId', { studentId })
        .getExists();
      if (hasGrades) throw new ApiException('CONFLICT');
      await manager.delete(Enrollment, { studentId, disciplineId });
    });
  }
}
