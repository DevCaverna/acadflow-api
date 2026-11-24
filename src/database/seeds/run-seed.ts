import dataSource from '@/database/data-source';
import { seedAcademicData } from '@/database/seeds/seed-academic-data';
import { seedUsers } from '@/database/seeds/seed-users';

async function run(): Promise<void> {
  const password = process.env.SEED_PASSWORD;
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed in production');
  if (!password || password.length < 8) {
    throw new Error('SEED_PASSWORD must have at least 8 characters');
  }
  await dataSource.initialize();
  try {
    await seedUsers(dataSource, password);
    await seedAcademicData(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
