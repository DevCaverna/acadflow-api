import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isForeignKeyViolation } from '@/common/database/postgres-error';
import { ApiException } from '@/common/filters/api.exception';
import { ActivityResponseDto } from '@/modules/activities/dto/activity-response.dto';
import type { CreateActivityDto } from '@/modules/activities/dto/create-activity.dto';
import type { UpdateActivityDto } from '@/modules/activities/dto/update-activity.dto';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import type { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    private readonly disciplinesService: DisciplinesService,
  ) {}

  async findAll({
    user,
    disciplineId,
  }: {
    user: User;
    disciplineId: string;
  }): Promise<ActivityResponseDto[]> {
    await this.disciplinesService.findVisibleOrFail({ user, id: disciplineId });

    const activities = await this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.disciplineId = :disciplineId', { disciplineId })
      .orderBy('activity.dueAt', 'ASC', 'NULLS LAST')
      .addOrderBy('activity.id', 'ASC')
      .getMany();

    return activities.map((activity) => ActivityResponseDto.from(activity));
  }

  async create({
    professorId,
    disciplineId,
    createActivityDto,
  }: {
    professorId: string;
    disciplineId: string;
    createActivityDto: CreateActivityDto;
  }): Promise<ActivityResponseDto> {
    await this.disciplinesService.findOwnedOrFail({ professorId, id: disciplineId });

    const { title, description, dueAt } = createActivityDto;
    const activity = this.activityRepository.create({
      disciplineId,
      title,
      description: description || null,
      dueAt: dueAt ? new Date(dueAt) : null,
    });
    await this.activityRepository.insert(activity);
    return ActivityResponseDto.from(activity);
  }

  async update({
    professorId,
    id,
    updateActivityDto,
  }: {
    professorId: string;
    id: string;
    updateActivityDto: UpdateActivityDto;
  }): Promise<ActivityResponseDto> {
    const activity = await this.findOwnedOrFail({ professorId, id });
    const { title, description, dueAt } = updateActivityDto;
    const changes: Partial<Pick<Activity, 'title' | 'description' | 'dueAt'>> = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description: description || null }),
      ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
    };
    if (Object.keys(changes).length > 0) await this.activityRepository.update({ id }, changes);
    return ActivityResponseDto.from(Object.assign(activity, changes));
  }

  async remove({ professorId, id }: { professorId: string; id: string }): Promise<void> {
    await this.findOwnedOrFail({ professorId, id });
    try {
      await this.activityRepository.delete({ id });
    } catch (error: unknown) {
      if (isForeignKeyViolation(error)) throw new ApiException('CONFLICT');
      throw error;
    }
  }

  private async findOwnedOrFail({
    professorId,
    id,
  }: {
    professorId: string;
    id: string;
  }): Promise<Activity> {
    const activity = await this.activityRepository.findOneBy({ id });
    if (!activity) throw new ApiException('NOT_FOUND');
    await this.disciplinesService.findOwnedOrFail({ professorId, id: activity.disciplineId });
    return activity;
  }
}
