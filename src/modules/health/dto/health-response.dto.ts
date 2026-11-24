import { ApiProperty } from '@nestjs/swagger';

export type DependencyStatus = 'up' | 'down' | 'timeout';

export class DependencyHealthDto {
  @ApiProperty({ enum: ['up', 'down', 'timeout'] })
  readonly status!: DependencyStatus;

  @ApiProperty()
  readonly latencyMs!: number;
}

export class HealthDependenciesDto {
  @ApiProperty({ type: DependencyHealthDto })
  readonly database!: DependencyHealthDto;
}

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'error'] })
  readonly status!: 'ok' | 'error';

  @ApiProperty()
  readonly timestamp!: string;

  @ApiProperty({ type: HealthDependenciesDto })
  readonly dependencies!: HealthDependenciesDto;
}
