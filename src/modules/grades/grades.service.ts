import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiException } from '@/common/filters/api.exception';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import { EnrollmentsService } from '@/modules/enrollments/enrollments.service';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import type { GradeResponseDto } from '@/modules/grades/dto/grade-response.dto';
import type { GradeSummaryDto, StudentGradesDto } from '@/modules/grades/dto/grade-summary.dto';
import { Grade } from '@/modules/grades/entities/grade.entity';
import { calculateGradeAverage } from '@/modules/grades/grade-average';
import type { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly disciplinesService: DisciplinesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async save({
    professorId,
    activityId,
    studentId,
    value,
  }: {
    professorId: string;
    activityId: string;
    studentId: string;
    value: number;
  }): Promise<GradeResponseDto> {
    const { disciplineId } = await this.findGradableActivity({ professorId, activityId });

    await this.gradeRepository.manager.transaction(async (manager) => {
      const enrollment = await manager.findOne(Enrollment, {
        where: { studentId, disciplineId },
        lock: { mode: 'pessimistic_read' },
      });
      if (!enrollment) throw new ApiException('STUDENT_NOT_ENROLLED');
      await manager.upsert(Grade, { activityId, studentId, value, updatedAt: new Date() }, [
        'activityId',
        'studentId',
      ]);
    });
    return { activityId, studentId, value };
  }

  async findAll({
    professorId,
    disciplineId,
  }: {
    professorId: string;
    disciplineId: string;
  }): Promise<StudentGradesDto[]> {
    const students = await this.enrollmentsService.findStudents({ professorId, disciplineId });
    const grades = await this.findGrades({ disciplineId });
    return students.map((student) => {
      const {
        grades: values,
        average,
        status,
      } = this.summarize({
        grades: grades.filter(({ studentId }) => studentId === student.id),
      });
      return { student, grades: values, average, status };
    });
  }

  async findMine({
    user,
    disciplineId,
  }: {
    user: User;
    disciplineId: string;
  }): Promise<GradeSummaryDto> {
    await this.disciplinesService.findVisibleOrFail({ user, id: disciplineId });
    return this.summarize({
      grades: await this.findGrades({ disciplineId, studentId: user.id }),
    });
  }

  private findGrades({
    disciplineId,
    studentId,
  }: {
    disciplineId: string;
    studentId?: string;
  }): Promise<Grade[]> {
    const qb = this.gradeRepository
      .createQueryBuilder('grade')
      .innerJoin(
        Activity,
        'activity',
        'activity.id = grade.activityId AND activity.disciplineId = :disciplineId',
        { disciplineId },
      )
      .orderBy('activity.id', 'ASC');
    if (studentId) qb.where('grade.studentId = :studentId', { studentId });
    return qb.getMany();
  }

  private summarize({ grades }: { grades: Grade[] }): GradeSummaryDto {
    return {
      grades: grades.map(({ activityId, value }) => ({ activityId, value })),
      ...calculateGradeAverage(grades.map(({ value }) => value)),
    };
  }

  private async findGradableActivity({
    professorId,
    activityId,
  }: {
    professorId: string;
    activityId: string;
  }): Promise<Activity> {
    const activity = await this.activityRepository
      .createQueryBuilder('activity')
      .innerJoinAndSelect('activity.discipline', 'discipline')
      .where('activity.id = :activityId', { activityId })
      .getOne();

    if (!activity) throw new ApiException('NOT_FOUND');
    if (activity.discipline.professorId !== professorId) throw new ApiException('FORBIDDEN');
    return activity;
  }
}
