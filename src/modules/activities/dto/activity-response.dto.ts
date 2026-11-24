import { ApiProperty } from '@nestjs/swagger';
import type { Activity } from '@/modules/activities/entities/activity.entity';

export class ActivityResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ format: 'uuid' })
  readonly disciplineId!: string;

  @ApiProperty()
  readonly title!: string;

  @ApiProperty({ type: String, nullable: true })
  readonly description!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  readonly dueAt!: string | null;

  static from({ id, disciplineId, title, description, dueAt }: Activity): ActivityResponseDto {
    return { id, disciplineId, title, description, dueAt: dueAt?.toISOString() ?? null };
  }
}
