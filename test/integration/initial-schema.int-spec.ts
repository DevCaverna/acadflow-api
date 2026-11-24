import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDatabaseOptions } from '@/config/database.config';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

describe('InitialSchema', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    dataSource = await new DataSource(getDatabaseOptions()).initialize();
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it('creates the expected tables', async () => {
    const rows: Array<{ name: string }> = await dataSource.query(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name <> 'migrations' ORDER BY 1`,
    );
    expect(rows.map(({ name }) => name)).toEqual([
      'activities',
      'activity_attachments',
      'disciplines',
      'enrollments',
      'grades',
      'users',
    ]);
  });

  it('rejects emails that differ only by case', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.startTransaction();
    const insert = `INSERT INTO users (name, email, password_hash, role) VALUES ('A', $1, 'x', 'ALUNO')`;
    const email = `${randomUUID()}@example.com`;
    try {
      await runner.query(insert, [email]);
      await expect(runner.query(insert, [email.toUpperCase()])).rejects.toThrow('UQ_users_email');
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('rejects grades outside the 0 to 10 range', async () => {
    await expect(
      dataSource.query(
        'INSERT INTO grades (student_id, activity_id, value) VALUES ($1, $2, 10.1)',
        [randomUUID(), randomUUID()],
      ),
    ).rejects.toThrow('CHK_grades_value');
  });
});
