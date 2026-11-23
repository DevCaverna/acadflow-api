import { spawnSync } from 'node:child_process';

const suite = process.env.TEST_SUITE ?? 'all';
const workers = Number(process.env.TEST_WORKERS ?? 4);
if (
  !['all', 'integration', 'e2e'].includes(suite) ||
  !Number.isInteger(workers) ||
  workers < 1 ||
  workers > 4
) {
  console.error('Invalid test suite or worker count');
  process.exit(2);
}
const configs = suite === 'all' ? ['integration', 'e2e'] : [suite];
for (const name of configs) {
  const run = spawnSync(
    'pnpm',
    [
      'exec',
      'vitest',
      'run',
      '--config',
      `vitest.config.${name}.ts`,
      '--maxWorkers',
      String(workers),
    ],
    { stdio: 'inherit' },
  );
  if (run.error || run.status !== 0) {
    if (run.error) console.error(run.error.message);
    process.exit(run.status ?? 1);
  }
}
