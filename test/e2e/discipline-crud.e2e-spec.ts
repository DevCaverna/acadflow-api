import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import type { Role } from '@/common/types/role';
import type { DisciplineResponseDto } from '@/modules/disciplines/dto/discipline-response.dto';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

type Account = { id: string; token: string };
type Method = 'get' | 'post' | 'patch' | 'delete';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7/;

describe('Discipline CRUD', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let owner: Account;
  let otherProfessor: Account;
  let student: Account;
  let outsider: Account;

  async function createUser(role: Role): Promise<Account> {
    const rows: Array<{ id: string }> = await dataSource.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Test', $1, 'x', $2) RETURNING id`,
      [`${randomUUID()}@example.com`, role],
    );
    const { id } = rows[0];
    return { id, token: await app.get(JwtService).signAsync({ sub: id }) };
  }

  function call(account: Account, method: Method, path: string, body?: object) {
    return request(app.getHttpServer())
      [method](path)
      .set('Accept-Language', 'en')
      .auth(account.token, { type: 'bearer' })
      .send(body);
  }

  function input(overrides: object = {}) {
    return { code: randomUUID().slice(0, 8), name: 'Databases', semester: '2026.2', ...overrides };
  }

  async function createDiscipline(overrides: object = {}): Promise<DisciplineResponseDto> {
    const response = await call(owner, 'post', '/disciplines', input(overrides)).expect(201);
    return response.body as DisciplineResponseDto;
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    [owner, otherProfessor, student, outsider] = await Promise.all([
      createUser('PROFESSOR'),
      createUser('PROFESSOR'),
      createUser('ALUNO'),
      createUser('ALUNO'),
    ]);
  });

  afterAll(async () => {
    await dataSource?.query('TRUNCATE grades, activities, enrollments, disciplines, users');
    await app?.close();
  });

  it('creates a discipline owned by the authenticated professor', async () => {
    const body = input({ name: '  Databases  ', professorId: otherProfessor.id });
    const response = await call(owner, 'post', '/disciplines', body).expect(201);
    expect(response.body).toEqual({
      id: expect.stringMatching(UUID_V7) as string,
      code: body.code,
      name: 'Databases',
      description: null,
      semester: '2026.2',
      professor: { id: owner.id, name: 'Test' },
    });
    const { id } = response.body as DisciplineResponseDto;
    expect((await call(owner, 'get', `/disciplines/${id}`)).body).toEqual(response.body);
  });

  it('rejects a repeated code and semester but accepts another semester', async () => {
    const { code } = await createDiscipline();
    const response = await call(otherProfessor, 'post', '/disciplines', input({ code }));
    expect(response.body).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    await createDiscipline({ code, semester: '2026.1' });
  });

  it.each([
    [{ code: '' }],
    [{ code: 'x'.repeat(21) }],
    [{ name: '   ' }],
    [{ name: 1 }],
    [{ semester: '2026/2' }],
    [{ semester: '2026.3' }],
    [{ description: 1 }],
  ])('rejects invalid creation %j', async (overrides) => {
    const response = await call(owner, 'post', '/disciplines', input(overrides));
    expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('translates the semester validation', async () => {
    const response = await call(owner, 'post', '/disciplines', input({ semester: 'x' }));
    expect(response.body).toMatchObject({
      message: 'The semester field must follow the format 2026.1 or 2026.2',
    });
  });

  it('shows the discipline only to its professor and enrolled students', async () => {
    const { id } = await createDiscipline();
    await dataSource.query('INSERT INTO enrollments (student_id, discipline_id) VALUES ($1, $2)', [
      student.id,
      id,
    ]);
    await call(owner, 'get', `/disciplines/${id}`).expect(200);
    await call(student, 'get', `/disciplines/${id}`).expect(200);
    await call(otherProfessor, 'get', `/disciplines/${id}`).expect(403);
    await call(outsider, 'get', `/disciplines/${id}`).expect(403);
  });

  it('updates only the name and the description', async () => {
    const created = await createDiscipline({ description: 'Old' });
    const path = `/disciplines/${created.id}`;
    const renamed = await call(owner, 'patch', path, {
      name: 'New',
      code: 'X',
      semester: '2027.1',
    });
    expect(renamed.body).toEqual(Object.assign({}, created, { name: 'New' }));
    const cleared = await call(owner, 'patch', path, { description: null });
    expect(cleared.body).toEqual(Object.assign({}, created, { name: 'New', description: null }));
    const unchanged = await call(owner, 'patch', path, {});
    expect(unchanged.body).toEqual(cleared.body);
    expect((await call(owner, 'get', path)).body).toEqual(cleared.body);
  });

  it.each([[{ name: null }], [{ name: '' }], [{ description: 1 }]])(
    'rejects invalid update %j',
    async (body) => {
      const { id } = await createDiscipline();
      const response = await call(owner, 'patch', `/disciplines/${id}`, body);
      expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
    },
  );

  it('prevents students and other professors from writing', async () => {
    const { id } = await createDiscipline();
    await call(student, 'post', '/disciplines', input()).expect(403);
    for (const account of [student, otherProfessor]) {
      await call(account, 'patch', `/disciplines/${id}`, { name: 'Hacked' }).expect(403);
      await call(account, 'delete', `/disciplines/${id}`).expect(403);
    }
    expect((await call(owner, 'get', `/disciplines/${id}`)).body).toMatchObject({
      name: 'Databases',
    });
  });

  it('removes a discipline without dependencies', async () => {
    const { id } = await createDiscipline();
    await call(owner, 'delete', `/disciplines/${id}`).expect(204);
    await call(owner, 'get', `/disciplines/${id}`).expect(404);
  });

  it.each([
    ['activities', `INSERT INTO activities (discipline_id, title) VALUES ($1, 'Test')`],
    [
      'enrollments',
      `INSERT INTO enrollments (discipline_id, student_id)
       SELECT $1, id FROM users WHERE role = 'ALUNO' LIMIT 1`,
    ],
  ])('keeps a discipline that has %s', async (_table, sql) => {
    const { id } = await createDiscipline();
    await dataSource.query(sql, [id]);
    const response = await call(owner, 'delete', `/disciplines/${id}`);
    expect(response.body).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    await call(owner, 'get', `/disciplines/${id}`).expect(200);
  });

  it.each(['get', 'patch', 'delete'] as const)('handles unknown and invalid ids: %s', async (m) => {
    const missing = await call(owner, m, `/disciplines/${randomUUID()}`, {});
    expect(missing.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    const invalid = await call(owner, m, '/disciplines/invalid', {});
    expect(invalid.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('requires authentication', async () => {
    await request(app.getHttpServer()).post('/disciplines').send(input()).expect(401);
  });
});
