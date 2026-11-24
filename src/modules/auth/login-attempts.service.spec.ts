import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginAttemptsService } from '@/modules/auth/login-attempts.service';

describe('LoginAttemptsService', () => {
  let service: LoginAttemptsService;
  const attempt = { email: 'ana@example.com', ip: '10.0.0.1' };

  beforeEach(() => {
    vi.useFakeTimers();
    service = new LoginAttemptsService();
    for (let count = 0; count < 5; count++) service.register(attempt);
  });

  afterEach(() => vi.useRealTimers());

  it('blocks the sixth attempt, ignoring email case', () => {
    expect(() => service.register({ ...attempt, email: 'ANA@example.com' })).toThrow(
      'TOO_MANY_REQUESTS',
    );
  });

  it('does not block another address or another account', () => {
    expect(() => service.register({ ...attempt, ip: '10.0.0.2' })).not.toThrow();
    expect(() => service.register({ ...attempt, email: 'bia@example.com' })).not.toThrow();
  });

  it('releases after the window or a successful login', () => {
    service.clear(attempt);
    expect(() => service.register(attempt)).not.toThrow();
    for (let count = 0; count < 4; count++) service.register(attempt);
    expect(() => service.register(attempt)).toThrow();
    vi.advanceTimersByTime(15 * 60_000);
    expect(() => service.register(attempt)).not.toThrow();
  });
});
