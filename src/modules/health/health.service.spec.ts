import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from '@/modules/health/health.service';

describe('HealthService', () => {
  const query = vi.fn();
  const service = new HealthService({ query } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns ok when the database responds', async () => {
    query.mockResolvedValue([]);
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.dependencies.database.status).toBe('up');
  });

  it('returns error without exposing details when the database is down', async () => {
    query.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.1'));
    const result = await service.check();
    expect(result.status).toBe('error');
    expect(result.dependencies.database.status).toBe('down');
    expect(JSON.stringify(result)).not.toContain('ECONNREFUSED');
  });

  it('returns timeout when the database does not respond', async () => {
    vi.useFakeTimers();
    query.mockReturnValue(new Promise(() => undefined));
    const check = service.check();
    await vi.advanceTimersByTimeAsync(3_000);
    expect((await check).dependencies.database.status).toBe('timeout');
  });
});
