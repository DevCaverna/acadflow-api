import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import { StudentResponseDto } from '@/modules/enrollments/dto/student-response.dto';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
}
