import { spawnSync } from 'node:child_process';

const name = process.argv[2];
if (!name || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
  console.error('Usage: pnpm migration:create CreateUsersTable');
  process.exit(1);
}

const binary = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(binary, ['exec', 'typeorm', 'migration:create', `src/database/migrations/${name}`], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
