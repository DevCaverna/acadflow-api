import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import type { Role } from '@/common/types/role';
import { seedUsers } from '@/database/seeds/seed-users';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

const PASSWORD = 'test-password';

type Account = { id: string; email: string; token: string };

describe('Auth and grades', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let owner: Account;
  let otherProfessor: Account;
  let student: Account;
  let outsider: Account;
  let activityId: string;

  async function insert(sql: string, params: unknown[]): Promise<string> {
    const rows: Array<{ id: string }> = await dataSource.query(`${sql} RETURNING id`, params);
    return rows[0].id;
  }

  function login(email: string, password: string, language = 'pt-BR') {
    return request(app.getHttpServer())
      .post('/auth/login')
      .set('Accept-Language', language)
      .send({ email, password });
  }

  async function createAccount(role: Role): Promise<Account> {
    const email = `${randomUUID()}@example.com`;
    const id = await insert(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Test', email, await hash(PASSWORD, 4), role],
    );
    const response = await login(email, PASSWORD);
    return { id, email, token: (response.body as { accessToken: string }).accessToken };
  }

  function saveGrade(account: Account, value: unknown, studentId = student.id, id = activityId) {
    return request(app.getHttpServer())
      .put(`/activities/${id}/grades/${studentId}`)
      .set('Accept-Language', 'en')
      .auth(account.token, { type: 'bearer' })
      .send({ value });
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    [owner, otherProfessor, student, outsider] = await Promise.all([
      createAccount('PROFESSOR'),
      createAccount('PROFESSOR'),
      createAccount('ALUNO'),
      createAccount('ALUNO'),
    ]);
    const disciplineId = await insert(
      'INSERT INTO disciplines (code, name, semester, professor_id) VALUES ($1, $2, $3, $4)',
      [randomUUID().slice(0, 8), 'Test', '2026.2', owner.id],
    );
    activityId = await insert('INSERT INTO activities (discipline_id, title) VALUES ($1, $2)', [
      disciplineId,
      'Test',
    ]);
    await dataSource.query('INSERT INTO enrollments (student_id, discipline_id) VALUES ($1, $2)', [
      student.id,
      disciplineId,
    ]);
  });

  afterAll(async () => {
    await dataSource?.query(
      'TRUNCATE grades, activities, enrollments, disciplines, users RESTART IDENTITY',
    );
    await app?.close();
  });

  it('logs in without exposing the password hash', async () => {
    const response = await login(student.email.toUpperCase(), PASSWORD);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      accessToken: expect.any(String) as string,
      user: { id: student.id, name: 'Test', email: student.email, role: 'ALUNO' },
    });
  });

  it.each([
    ['pt-BR', 'Credenciais inválidas'],
    ['en', 'Invalid credentials'],
  ])('rejects wrong password and unknown email equally in %s', async (language, message) => {
    const expected = { statusCode: 401, code: 'INVALID_CREDENTIALS', message };
    expect((await login(student.email, 'wrong', language)).body).toEqual(expected);
    expect((await login('nobody@example.com', PASSWORD, language)).body).toEqual(expected);
  });

  it.each([
    ['pt-BR', 'O campo e-mail deve ser um e-mail válido'],
    ['en', 'The email field must be a valid email'],
  ])('translates login validation to %s', async (language, message) => {
    const response = await login('invalid', PASSWORD, language);
    expect(response.body).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', message });
  });

  it('returns the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .auth(owner.token, { type: 'bearer' });
    expect(response.body).toMatchObject({ id: owner.id, role: 'PROFESSOR' });
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  it('rejects missing, invalid and expired tokens', async () => {
    const expired = await app.get(JwtService).signAsync({ sub: owner.id }, { expiresIn: -1 });
    for (const token of [undefined, 'invalid', expired]) {
      const call = request(app.getHttpServer()).get('/auth/me').set('Accept-Language', 'en');
      if (token) void call.auth(token, { type: 'bearer' });
      expect((await call).body).toEqual({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    }
  });

  it('prevents a student from saving grades', async () => {
    const response = await saveGrade(student, 10);
    expect(response.body).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('prevents a professor from grading another professor discipline', async () => {
    const response = await saveGrade(otherProfessor, 10);
    expect(response.body).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('rejects students that are not enrolled', async () => {
    const response = await saveGrade(owner, 8, outsider.id);
    expect(response.body).toMatchObject({ statusCode: 422, code: 'STUDENT_NOT_ENROLLED' });
  });

  it('returns 404 for an unknown activity', async () => {
    const response = await saveGrade(owner, 8, student.id, randomUUID());
    expect(response.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  it.each([-0.1, 10.1, 15, 7.55, '8', null])('rejects invalid grade %s', async (value) => {
    const response = await saveGrade(owner, value);
    expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('creates and then updates a single grade', async () => {
    for (const value of [0, 10, 7.5]) {
      const response = await saveGrade(owner, value);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ activityId, studentId: student.id, value });
    }
    const rows: Array<{ value: string }> = await dataSource.query(
      'SELECT value FROM grades WHERE activity_id = $1',
      [activityId],
    );
    expect(rows).toEqual([{ value: '7.5' }]);
  });

  it('seeds demo users repeatedly without duplicates', async () => {
    await seedUsers(dataSource, PASSWORD);
    await seedUsers(dataSource, PASSWORD);
    const rows: Array<{ role: Role; hash: string }> = await dataSource.query(
      `SELECT role, password_hash AS hash FROM users WHERE email LIKE '%@acadflow.local'`,
    );
    expect(rows.map(({ role }) => role).sort()).toEqual(['ALUNO', 'ALUNO', 'PROFESSOR']);
    expect(rows.every(({ hash: value }) => value.startsWith('$2'))).toBe(true);
    expect((await login('professor@acadflow.local', PASSWORD)).status).toBe(200);
  });
});
