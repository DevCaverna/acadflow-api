import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

describe('GET /health', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('returns the API and database status', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      dependencies: { database: { status: 'up' } },
    });
  });
});
