import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const suite = process.argv[2] ?? 'all';
const count = Number(process.argv[3] ?? process.env.TEST_WORKERS ?? 4);
if (
  !['all', 'integration', 'e2e'].includes(suite) ||
  !Number.isInteger(count) ||
  count < 1 ||
  count > 4
) {
  console.error('Usage: pnpm test:docker [1..4] | pnpm test:integration:docker [1..4]');
  process.exit(2);
}

const project = `acadflow-test-${process.pid}`;
const envFile = existsSync('.env.test') ? '.env.test' : '.env.test.example';
const prefix = ['compose', '-p', project, '--env-file', envFile, '-f', 'docker/compose.test.yml'];
const call = (args) => spawnSync('docker', [...prefix, ...args], { stdio: 'inherit' });
let exitCode = 1;
try {
  const up = call(['up', '-d', '--wait', 'postgres']);
  if (up.error) throw up.error;
  if (up.status !== 0) throw new Error('Test database did not start');
  const run = call([
    'run',
    '--build',
    '--rm',
    '-e',
    `TEST_WORKERS=${count}`,
    '-e',
    `TEST_SUITE=${suite}`,
    'test-runner',
  ]);
  if (run.error) throw run.error;
  exitCode = run.status ?? 1;
} catch (error) {
  console.error(error.message);
} finally {
  const down = call(['down', '--volumes', '--remove-orphans']);
  if (down.error || down.status !== 0) {
    console.error('Docker cleanup failed; check temporary Compose project:', project);
    exitCode ||= 1;
  }
}
process.exit(exitCode);
