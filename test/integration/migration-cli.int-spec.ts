import { spawnSync } from 'node:child_process';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import { getDatabaseOptions } from '@/config/database.config';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

const CLI_TIMEOUT_MS = 60_000;

describe('Migration CLI', () => {
  const workerDatabase = getWorkerDatabaseName();
  const database = `${workerDatabase}_cli`;
  let admin: DataSource;
  let dataSource: DataSource;

  function runCli(command: string): string {
    const result = spawnSync(
      'pnpm',
      ['exec', 'typeorm', `migration:${command}`, '-d', 'dist/database/data-source.js'],
      { encoding: 'utf8', env: { ...process.env, DB_DATABASE: database } },
    );
    expect(result.status, result.stdout + result.stderr).toBe(0);
    return result.stdout;
  }

  function countMigrations(marker: '[X]' | '[ ]'): number {
    return runCli('show').split(marker).length - 1;
  }

  async function listTables(): Promise<string[]> {
    const rows: Array<{ name: string }> = await dataSource.query(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY 1`,
    );
    return rows.map(({ name }) => name);
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = workerDatabase;
    admin = await new DataSource(getDatabaseOptions()).initialize();
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${database}"`);
    process.env.DB_DATABASE = database;
    dataSource = await new DataSource(getDatabaseOptions()).initialize();
  });

  afterAll(async () => {
    process.env.DB_DATABASE = workerDatabase;
    await dataSource?.destroy();
    await admin?.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin?.destroy();
  });

  it('does not run migrations when multiple API instances start', async () => {
    const apps = await Promise.all(
      [1, 2].map(async () => {
        const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
        return module.createNestApplication().init();
      }),
    );
    await Promise.all(apps.map((app) => app.close()));
    expect(await listTables()).toEqual([]);
  });

  it(
    'shows, runs and reverts the compiled migrations',
    async () => {
      const total = dataSource.migrations.length;
      expect(total).toBeGreaterThan(0);
      expect(countMigrations('[ ]')).toBe(total);

      runCli('run');
      expect(countMigrations('[X]')).toBe(total);
      expect(await listTables()).toContain('grades');

      runCli('revert');
      expect(countMigrations('[X]')).toBe(total - 1);
      expect(countMigrations('[ ]')).toBe(1);

      runCli('run');
      expect(countMigrations('[X]')).toBe(total);
    },
    CLI_TIMEOUT_MS,
  );
});
