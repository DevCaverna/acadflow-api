import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { ApiException } from '@/common/filters/api.exception';
import { BCRYPT_ROUNDS } from '@/config/security.constants';
import type { LoginDto } from '@/modules/auth/dto/login.dto';
import type { SessionDto } from '@/modules/auth/dto/session.dto';
import { LoginAttemptsService } from '@/modules/auth/login-attempts.service';
import { AvatarsService } from '@/modules/users/avatars.service';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class AuthService {
  private readonly placeholderHash = hash('placeholder', BCRYPT_ROUNDS);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly avatarsService: AvatarsService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  async login({ loginDto, ip }: { loginDto: LoginDto; ip: string }): Promise<SessionDto> {
    const { email, password } = loginDto;
    this.loginAttempts.register({ email, ip });
    const user = await this.users.findByEmailWithPassword({ email });
    const matches = await compare(password, user?.passwordHash ?? (await this.placeholderHash));
    if (!user || !matches) throw new ApiException('INVALID_CREDENTIALS');
    this.loginAttempts.clear({ email, ip });
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: await this.avatarsService.toResponse({ user }),
    };
  }
}
