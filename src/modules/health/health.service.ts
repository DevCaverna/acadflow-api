import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  DependencyHealthDto,
  HealthResponseDto,
} from '@/modules/health/dto/health-response.dto';

const DATABASE_TIMEOUT_MS = 3_000;

class HealthTimeoutError extends Error {}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthResponseDto> {
    const database = await this.checkDatabase();
    return {
      status: database.status === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      dependencies: { database },
    };
  }

  private async checkDatabase(): Promise<DependencyHealthDto> {
    const start = Date.now();
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new HealthTimeoutError()), DATABASE_TIMEOUT_MS);
      });
      await Promise.race([this.dataSource.query('SELECT 1'), timeout]);
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error: unknown) {
      const status = error instanceof HealthTimeoutError ? 'timeout' : 'down';
      this.logger.error(`Database health check: ${status}`, error);
      return { status, latencyMs: Date.now() - start };
    } finally {
      clearTimeout(timer);
    }
  }
}
