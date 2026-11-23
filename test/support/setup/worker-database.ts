/**
 * Each Vitest worker uses its own PostgreSQL database.
 * Import this helper in integration/e2e test database factories.
 */
export function getWorkerDatabaseName(): string {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Worker database can only be used in test mode');
  }
  const workerId = Number(process.env.VITEST_POOL_ID ?? 1);
  const workers = Number(process.env.TEST_WORKERS ?? 4);
  const prefix = process.env.TEST_DB_PREFIX ?? 'acadflow_test';
  if (
    !Number.isInteger(workerId) ||
    workerId < 1 ||
    workerId > workers ||
    !/^[a-z][a-z0-9_]*$/.test(prefix)
  ) {
    throw new Error('Invalid Vitest worker or test database prefix');
  }
  return `${prefix}_${workerId}`;
}
