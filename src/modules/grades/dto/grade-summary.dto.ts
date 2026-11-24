import { ApiProperty } from '@nestjs/swagger';
import { StudentResponseDto } from '@/modules/enrollments/dto/student-response.dto';
import { GRADE_STATUSES, type GradeStatus } from '@/modules/grades/grade-average';

export class ActivityGradeDto {
  @ApiProperty({ format: 'uuid' })
  readonly activityId!: string;

  @ApiProperty()
  readonly value!: number;
}

export class GradeSummaryDto {
  @ApiProperty({ type: ActivityGradeDto, isArray: true })
  readonly grades!: ActivityGradeDto[];

  @ApiProperty({ type: Number, nullable: true })
  readonly average!: number | null;

  @ApiProperty({ enum: GRADE_STATUSES })
  readonly status!: GradeStatus;
}

export class StudentGradesDto extends GradeSummaryDto {
  @ApiProperty({ type: StudentResponseDto })
  readonly student!: StudentResponseDto;
}
