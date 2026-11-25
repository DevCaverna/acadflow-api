import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { ApiException } from '@/common/filters/api.exception';
import { BCRYPT_ROUNDS } from '@/config/security.constants';
import { AttemptLimiter } from '@/modules/auth/attempt-limiter';
import type { LoginDto } from '@/modules/auth/dto/login.dto';
import type { RegisterDto } from '@/modules/auth/dto/register.dto';
import type { SessionDto } from '@/modules/auth/dto/session.dto';
import { LoginAttemptsService } from '@/modules/auth/login-attempts.service';
import { AvatarsService } from '@/modules/users/avatars.service';
import type { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

@Injectable()
export class AuthService {
  private readonly placeholderHash = hash('placeholder', BCRYPT_ROUNDS);
  private readonly registrationAttempts = new AttemptLimiter();

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
    return this.createSession(user);
  }

  async register({
    registerDto,
    ip,
  }: {
    registerDto: RegisterDto;
    ip: string;
  }): Promise<SessionDto> {
    this.registrationAttempts.register(ip);
    const user = await this.users.createAccount(registerDto);
    return this.createSession(user);
  }

  private async createSession(user: User): Promise<SessionDto> {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: await this.avatarsService.toResponse({ user }),
    };
  }
}
