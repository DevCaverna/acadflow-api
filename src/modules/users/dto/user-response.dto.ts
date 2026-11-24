import { ApiProperty } from '@nestjs/swagger';
import { type Role, ROLES } from '@/common/types/role';
import type { User } from '@/modules/users/entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty()
  readonly email!: string;

  @ApiProperty({ enum: ROLES })
  readonly role!: Role;

  @ApiProperty({ type: String, nullable: true, description: 'URL assinada, válida por 5 minutos' })
  readonly avatarUrl!: string | null;

  static from(
    { id, name, email, role }: User,
    { avatarUrl }: { avatarUrl: string | null },
  ): UserResponseDto {
    return { id, name, email, role, avatarUrl };
  }
}
