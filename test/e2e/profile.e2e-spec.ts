import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import { createUser } from '@/database/cli/create-user';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

const PASSWORD = 'test-password';

describe('Profile', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let email: string;
  let token: string;

  function create(overrides: object = {}): Promise<void> {
    return createUser({
      dataSource,
      name: 'Ana',
      email,
      role: 'ALUNO',
      password: PASSWORD,
      ...overrides,
    });
  }

  function login(address: string, password: string) {
    return request(app.getHttpServer()).post('/auth/login').send({ email: address, password });
  }

  function patch(path: string, body: object) {
    return request(app.getHttpServer())
      .patch(path)
      .set('Accept-Language', 'en')
      .auth(token, { type: 'bearer' })
      .send(body);
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    email = `${randomUUID()}@example.com`;
    await create();
    token = ((await login(email, PASSWORD)).body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await dataSource?.query('TRUNCATE grades, activities, enrollments, disciplines, users');
    await app?.close();
  });

  it('returns and updates only the allowed fields', async () => {
    const other = `${randomUUID()}@example.com`;
    const response = await patch('/users/me', {
      name: '  Ana Maria ',
      email: other.toUpperCase(),
      role: 'PROFESSOR',
      passwordHash: 'x',
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Ana Maria', email: other, role: 'ALUNO' });
    expect(Object.keys(response.body as object).sort()).toEqual(['email', 'id', 'name', 'role']);
    const me = await request(app.getHttpServer()).get('/users/me').auth(token, { type: 'bearer' });
    expect(me.body).toEqual(response.body);
    expect((await patch('/users/me', {})).body).toEqual(response.body);
  });

  it('rejects an email in use, ignoring case', async () => {
    const taken = `${randomUUID()}@example.com`;
    await create({ email: taken });
    const response = await patch('/users/me', { email: taken.toUpperCase() });
    expect(response.body).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it.each([[{ name: ' ' }], [{ name: null }], [{ email: 'invalid' }], [{ email: null }]])(
    'rejects invalid profile %j',
    async (body) => {
      expect((await patch('/users/me', body)).body).toMatchObject({ code: 'VALIDATION_ERROR' });
    },
  );

  it('changes the password', async () => {
    const newPassword = 'new-password';
    await patch('/users/me/password', { currentPassword: PASSWORD, newPassword }).expect(204);
    await login(email, PASSWORD).expect(401);
    await login(email, newPassword).expect(200);
  });

  it('requires the current password without ending the session', async () => {
    const response = await patch('/users/me/password', {
      currentPassword: 'wrong',
      newPassword: 'new-password',
    });
    expect(response.body).toEqual({
      statusCode: 400,
      code: 'INVALID_CURRENT_PASSWORD',
      message: 'Current password is incorrect',
    });
    await login(email, PASSWORD).expect(200);
  });

  it.each(['short', 'á'.repeat(37), 12345678])('rejects new password %s', async (newPassword) => {
    const response = await patch('/users/me/password', { currentPassword: PASSWORD, newPassword });
    expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('explains the password limit in bytes', async () => {
    const response = await patch('/users/me/password', {
      currentPassword: PASSWORD,
      newPassword: 'á'.repeat(37),
    });
    expect(response.body).toMatchObject({
      message: 'The new password field must have at most 72 bytes',
    });
    await patch('/users/me/password', {
      currentPassword: PASSWORD,
      newPassword: 'á'.repeat(36),
    }).expect(204);
  });

  it('requires authentication', async () => {
    const server = app.getHttpServer();
    await request(server).get('/users/me').expect(401);
    await request(server).patch('/users/me').send({ name: 'X' }).expect(401);
    await request(server).patch('/users/me/password').send({}).expect(401);
  });

  it.each([
    [{ name: ' ' }],
    [{ email: 'invalid' }],
    [{ role: 'ADMIN' }],
    [{ password: 'short' }],
    [{ password: undefined }],
  ])('does not create invalid account %j', async (overrides) => {
    const input = { email: `${randomUUID()}@example.com`, ...overrides };
    await expect(create(input)).rejects.toThrow();
  });

  it('does not create a duplicated account', async () => {
    await expect(create({ email: email.toUpperCase() })).rejects.toThrow('already exists');
  });

  it('runs the process in UTC', () => {
    expect(new Date(0).getTimezoneOffset()).toBe(0);
  });
});
