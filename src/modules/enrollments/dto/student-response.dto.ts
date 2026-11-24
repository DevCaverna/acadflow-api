import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@/modules/users/entities/user.entity';

export class StudentResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty()
  readonly email!: string;

  static from({ id, name, email }: User): StudentResponseDto {
    return { id, name, email };
  }
}
