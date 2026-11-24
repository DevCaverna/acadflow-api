import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiException } from '@/common/filters/api.exception';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import type { GradeResponseDto } from '@/modules/grades/dto/grade-response.dto';
import { Grade } from '@/modules/grades/entities/grade.entity';
import type { ActivityAccessRow } from '@/modules/grades/grades.types';

@Injectable()
export class GradesService {
  constructor(
    @InjectRepository(Grade)
    private readonly gradeRepository: Repository<Grade>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
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
    await this.assertCanGrade({ professorId, activityId, studentId });

    await this.gradeRepository.upsert({ activityId, studentId, value, updatedAt: new Date() }, [
      'activityId',
      'studentId',
    ]);
    return { activityId, studentId, value };
  }

  private async assertCanGrade({
    professorId,
    activityId,
    studentId,
  }: {
    professorId: string;
    activityId: string;
    studentId: string;
  }): Promise<void> {
    const access = await this.activityRepository
      .createQueryBuilder('activity')
      .innerJoin('activity.discipline', 'discipline')
      .leftJoin(
        Enrollment,
        'enrollment',
        'enrollment.disciplineId = discipline.id AND enrollment.studentId = :studentId',
        { studentId },
      )
      .select('discipline.professorId', 'professorId')
      .addSelect('enrollment.studentId', 'enrolledStudentId')
      .where('activity.id = :activityId', { activityId })
      .getRawOne<ActivityAccessRow>();

    if (!access) throw new ApiException('NOT_FOUND');
    if (access.professorId !== professorId) throw new ApiException('FORBIDDEN');
    if (!access.enrolledStudentId) throw new ApiException('STUDENT_NOT_ENROLLED');
  }
}
