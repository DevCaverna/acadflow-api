import { Client } from 'pg';
import { spawnSync } from 'node:child_process';

if (process.env.NODE_ENV !== 'test' || process.env.DB_HOST !== 'postgres') {
  throw new Error('Refusing to prepare a database outside the temporary PostgreSQL Compose service');
}
const count = Number(process.env.TEST_WORKERS ?? 4);
const prefix = process.env.TEST_DB_PREFIX ?? 'acadflow_test';
if (!Number.isInteger(count) || count < 1 || count > 4 || !/^[a-z][a-z0-9_]*$/.test(prefix)) {
  throw new Error('Unsafe TEST_WORKERS or TEST_DB_PREFIX');
}
const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: 'postgres',
});
await client.connect();
try {
  for (let id = 1; id <= count; id++) {
    const name = `${prefix}_${id}`;
    const row = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!row.rowCount) {
      await client.query(`CREATE DATABASE "${name}"`);
    }
    const migrate = spawnSync('pnpm', ['migration:run'], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test', DB_DATABASE: name },
    });
    if (migrate.error || migrate.status !== 0) {
      if (migrate.error) console.error(migrate.error.message);
      throw new Error(`Migrations failed on ${name}`);
    }
  }
} finally {
  await client.end();
}
