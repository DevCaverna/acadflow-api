import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { ApiException } from '@/common/filters/api.exception';
import { BCRYPT_ROUNDS } from '@/config/security.constants';
import type { LoginDto } from '@/modules/auth/dto/login.dto';
import type { SessionDto } from '@/modules/auth/dto/session.dto';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class AuthService {
  private readonly placeholderHash = hash('placeholder', BCRYPT_ROUNDS);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login({ loginDto }: { loginDto: LoginDto }): Promise<SessionDto> {
    const { email, password } = loginDto;
    const user = await this.users.findByEmailWithPassword({ email });
    const matches = await compare(password, user?.passwordHash ?? (await this.placeholderHash));
    if (!user || !matches) throw new ApiException('INVALID_CREDENTIALS');
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: UserResponseDto.from(user),
    };
  }
}
