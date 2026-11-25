import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import type { SessionDto } from '@/modules/auth/dto/session.dto';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

const PASSWORD = 'test-password';

describe('Public registration', () => {
  let app: NestExpressApplication<Server>;
  let dataSource: DataSource;

  function registration(overrides: object = {}, ip = '192.0.2.1') {
    return request(app.getHttpServer())
      .post('/auth/register')
      .set('X-Forwarded-For', ip)
      .send({
        name: '  Academic User  ',
        email: `${randomUUID()}@EXAMPLE.COM`,
        password: PASSWORD,
        role: 'ALUNO',
        ...overrides,
      });
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication<NestExpressApplication<Server>>();
    app.set('trust proxy', 'loopback');
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource?.query('DELETE FROM users WHERE email LIKE $1', [
      'registration-%@example.com',
    ]);
    await app?.close();
  });

  it.each(['ALUNO', 'PROFESSOR'])('creates and signs in as %s', async (role) => {
    const email = `registration-${randomUUID()}@example.com`;
    const response = await registration({ email: ` ${email.toUpperCase()} `, role });
    expect(response.status).toBe(201);
    const { user, accessToken } = response.body as SessionDto;
    expect(user).toEqual({
      id: expect.any(String),
      avatarUrl: null,
      name: 'Academic User',
      email,
      role,
    });
    expect(
      (await request(app.getHttpServer()).get('/auth/me').auth(accessToken, { type: 'bearer' }))
        .body,
    ).toEqual(user);
    const disciplines = await request(app.getHttpServer())
      .get('/disciplines')
      .auth(accessToken, { type: 'bearer' });
    expect(disciplines.body).toMatchObject({ total: 0, data: [] });
    if (role === 'ALUNO') {
      const create = await request(app.getHttpServer())
        .post('/disciplines')
        .auth(accessToken, { type: 'bearer' })
        .send({ code: 'ACA33', name: 'Course', semester: '2026.2' });
      expect(create.status).toBe(403);
    }
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ user });
  });

  it('rejects concurrent duplicate emails without changing the account', async () => {
    const email = `registration-${randomUUID()}@example.com`;
    const responses = await Promise.all([
      registration({ email, role: 'ALUNO' }),
      registration({ email: email.toUpperCase(), role: 'PROFESSOR' }),
    ]);
    expect(responses.map(({ status }) => status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(responses.find(({ status }) => status === 409)?.body).toMatchObject({
      code: 'EMAIL_ALREADY_IN_USE',
    });
  });

  it.each([
    { role: 'ADMIN' },
    { role: null },
    { name: ' ' },
    { email: 'invalid' },
    { password: 'short' },
    { password: 'á'.repeat(37) },
  ])('rejects invalid data %j', async (body) => {
    const response = await registration(body);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('limits attempts by IP across different email addresses', async () => {
    const ip = '192.0.2.2';
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await registration(
        { email: `registration-${randomUUID()}@example.com` },
        ip,
      );
      expect(response.status).toBe(201);
    }
    const response = await registration({ role: 'PROFESSOR' }, ip);
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ code: 'TOO_MANY_REQUESTS' });
  });
});
