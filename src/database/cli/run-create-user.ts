import { parseArgs } from 'node:util';
import { createUser } from '@/database/cli/create-user';
import dataSource from '@/database/data-source';

async function run(): Promise<void> {
  const { values } = parseArgs({
    options: { name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string' } },
  });
  await dataSource.initialize();
  try {
    await createUser({ dataSource, ...values, password: process.env.USER_PASSWORD });
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
