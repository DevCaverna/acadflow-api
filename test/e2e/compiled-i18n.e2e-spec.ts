import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import { type AddressInfo, createServer } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

const START_TIMEOUT_MS = 30_000;

async function getFreePort(): Promise<number> {
  const server = createServer().listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  server.close();
  await once(server, 'close');
  return port;
}

describe('Compiled build translations', () => {
  let api: ChildProcess;
  let url: string;

  beforeAll(async () => {
    const port = await getFreePort();
    url = `http://127.0.0.1:${port}`;
    api = spawn(process.execPath, ['dist/main.js'], {
      env: { ...process.env, PORT: String(port), DB_DATABASE: getWorkerDatabaseName() },
      stdio: 'ignore',
    });
    await vi.waitFor(() => fetch(`${url}/health`), { timeout: START_TIMEOUT_MS, interval: 250 });
  }, START_TIMEOUT_MS);

  afterAll(async () => {
    if (api.exitCode === null) {
      const exit = once(api, 'exit');
      api.kill('SIGKILL');
      await exit;
    }
  });

  it.each([
    ['pt-BR', 'Recurso não encontrado'],
    ['es', 'Recurso não encontrado'],
    ['en', 'Resource not found'],
  ])('responds in %s', async (language, message) => {
    const response = await fetch(`${url}/missing`, { headers: { 'Accept-Language': language } });
    expect(await response.json()).toEqual({ statusCode: 404, code: 'NOT_FOUND', message });
  });
});
