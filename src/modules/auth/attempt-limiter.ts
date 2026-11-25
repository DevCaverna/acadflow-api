import { ApiException } from '@/common/filters/api.exception';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60_000;
const MAX_ENTRIES = 10_000;

type Attempts = { count: number; expiresAt: number };

export class AttemptLimiter {
  private readonly attempts = new Map<string, Attempts>();

  register(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (!current || current.expiresAt <= now) {
      this.makeRoom(now);
      this.attempts.set(key, { count: 1, expiresAt: now + WINDOW_MS });
      return;
    }
    if (current.count >= MAX_ATTEMPTS) throw new ApiException('TOO_MANY_REQUESTS');
    current.count += 1;
  }

  clear(key: string): void {
    this.attempts.delete(key);
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
