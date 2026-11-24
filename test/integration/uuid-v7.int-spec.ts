import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDatabaseOptions } from '@/config/database.config';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('UUID v7', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    dataSource = await new DataSource(getDatabaseOptions()).initialize();
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it('is the default of every id column', async () => {
    const rows: Array<{ table: string; value: string }> = await dataSource.query(
      `SELECT table_name AS "table", column_default AS value FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'id' AND data_type = 'uuid' ORDER BY 1`,
    );
    expect(rows.map(({ table }) => table)).toEqual([
      'activities',
      'disciplines',
      'grades',
      'users',
    ]);
    expect(rows.every(({ value }) => value.includes('uuid_generate_v7()'))).toBe(true);
  });

  it('generates version 7 ids with the current timestamp', async () => {
    const before = Date.now();
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    try {
      const rows = (await runner.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('A', $1, 'x', 'ALUNO') RETURNING id`,
        [`${randomUUID()}@example.com`],
      )) as Array<{ id: string }>;
      const { id } = rows[0];
      expect(id).toMatch(UUID_V7);
      const timestamp = Number.parseInt(id.replaceAll('-', '').slice(0, 12), 16);
      expect(Math.abs(timestamp - before)).toBeLessThan(60_000);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
