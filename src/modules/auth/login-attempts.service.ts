import { Injectable } from '@nestjs/common';
import { AttemptLimiter } from '@/modules/auth/attempt-limiter';

@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new AttemptLimiter();

  register({ email, ip }: { email: string; ip: string }): void {
    this.attempts.register(this.getKey({ email, ip }));
  }

  clear({ email, ip }: { email: string; ip: string }): void {
    this.attempts.clear(this.getKey({ email, ip }));
  }

  private getKey({ email, ip }: { email: string; ip: string }): string {
    return `${ip}|${email.toLowerCase()}`;
  }
}
