import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';

export class SessionDto {
  @ApiProperty()
  readonly accessToken!: string;

  @ApiProperty({ type: UserResponseDto })
  readonly user!: UserResponseDto;
}
