import { ApiProperty } from '@nestjs/swagger';

export class GradeResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly activityId!: string;

  @ApiProperty({ format: 'uuid' })
  readonly studentId!: string;

  @ApiProperty()
  readonly value!: number;
}
