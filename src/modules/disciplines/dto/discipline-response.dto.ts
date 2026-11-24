import { ApiProperty } from '@nestjs/swagger';
import type { Discipline } from '@/modules/disciplines/entities/discipline.entity';

export class DisciplineProfessorDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;
}

export class DisciplineResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'ES101' })
  readonly code!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty({ type: String, nullable: true })
  readonly description!: string | null;

  @ApiProperty({ example: '2026.2' })
  readonly semester!: string;

  @ApiProperty({ type: DisciplineProfessorDto })
  readonly professor!: DisciplineProfessorDto;

  static from({
    id,
    code,
    name,
    description,
    semester,
    professor,
  }: Discipline): DisciplineResponseDto {
    return {
      id,
      code,
      name,
      description,
      semester,
      professor: { id: professor.id, name: professor.name },
    };
  }
}
