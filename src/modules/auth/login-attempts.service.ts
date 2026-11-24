import { Injectable } from '@nestjs/common';
import { ApiException } from '@/common/filters/api.exception';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;
const MAX_ENTRIES = 10_000;

type Attempts = { count: number; expiresAt: number };

@Injectable()
export class LoginAttemptsService {
  private readonly attempts = new Map<string, Attempts>();

  register({ email, ip }: { email: string; ip: string }): void {
    const now = Date.now();
    const key = this.getKey({ email, ip });
    const current = this.attempts.get(key);
    if (!current || current.expiresAt <= now) {
      this.makeRoom(now);
      this.attempts.set(key, { count: 1, expiresAt: now + WINDOW_MS });
      return;
    }
    if (current.count >= MAX_ATTEMPTS) throw new ApiException('TOO_MANY_REQUESTS');
    current.count += 1;
  }

  clear({ email, ip }: { email: string; ip: string }): void {
    this.attempts.delete(this.getKey({ email, ip }));
  }

  private getKey({ email, ip }: { email: string; ip: string }): string {
    return `${ip}|${email.toLowerCase()}`;
  }

  private makeRoom(now: number): void {
    if (this.attempts.size < MAX_ENTRIES) return;
    for (const [key, { expiresAt }] of this.attempts) {
      if (expiresAt <= now) this.attempts.delete(key);
    }
    const oldest = this.attempts.keys().next().value;
    if (this.attempts.size >= MAX_ENTRIES && oldest !== undefined) this.attempts.delete(oldest);
  }
}
