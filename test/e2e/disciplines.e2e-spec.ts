import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import type { Listing } from '@/common/dto/listing.dto';
import type { Role } from '@/common/types/role';
import type { DisciplineResponseDto } from '@/modules/disciplines/dto/discipline-response.dto';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

describe('GET /disciplines', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let professorToken: string;
  let studentToken: string;

  async function insert(sql: string, params: unknown[]): Promise<string> {
    const rows: Array<{ id: string }> = await dataSource.query(`${sql} RETURNING id`, params);
    return rows[0].id;
  }

  async function createUser(role: Role): Promise<{ id: string; token: string }> {
    const id = await insert(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Test', `${randomUUID()}@example.com`, 'x', role],
    );
    return { id, token: await app.get(JwtService).signAsync({ sub: id }) };
  }

  function createDiscipline(professorId: string, code: string, name: string, semester: string) {
    return insert(
      'INSERT INTO disciplines (code, name, semester, professor_id) VALUES ($1, $2, $3, $4)',
      [code, name, semester, professorId],
    );
  }

  function list(token: string, query: Record<string, string> = {}) {
    return request(app.getHttpServer())
      .get('/disciplines')
      .query(query)
      .set('Accept-Language', 'en')
      .auth(token, { type: 'bearer' });
  }

  async function listCodes(token: string, query: Record<string, string> = {}): Promise<string[]> {
    const response = await list(token, query).expect(200);
    return (response.body as Listing<DisciplineResponseDto>).data.map(({ code }) => code);
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const professor = await createUser('PROFESSOR');
    const otherProfessor = await createUser('PROFESSOR');
    const student = await createUser('ALUNO');
    professorToken = professor.token;
    studentToken = student.token;

    await createDiscipline(professor.id, 'A1', 'Algebra', '2026.1');
    await createDiscipline(professor.id, 'B1', 'Banco_de dados', '2026.2');
    const enrolled = await createDiscipline(professor.id, 'C1', 'Calculo', '2026.2');
    await createDiscipline(otherProfessor.id, 'D1', 'Design', '2026.2');
    await dataSource.query('INSERT INTO enrollments (student_id, discipline_id) VALUES ($1, $2)', [
      student.id,
      enrolled,
    ]);
  });

  afterAll(async () => {
    await dataSource?.query(
      'TRUNCATE activity_attachments, grades, activities, enrollments, disciplines, users',
    );
    await app?.close();
  });

  it('lists only the disciplines of the professor with defaults', async () => {
    const { body } = (await list(professorToken)) as { body: Listing<DisciplineResponseDto> };
    expect(body).toMatchObject({ page: 1, perPage: 20, total: 3 });
    expect(body.data.map(({ code }) => code)).toEqual(['A1', 'B1', 'C1']);
    expect(Object.keys(body.data[0]).sort()).toEqual([
      'code',
      'description',
      'id',
      'name',
      'professor',
      'semester',
    ]);
    expect(Object.keys(body.data[0].professor).sort()).toEqual(['id', 'name']);
  });

  it('lists only the disciplines in which the student is enrolled', async () => {
    expect(await listCodes(studentToken)).toEqual(['C1']);
  });

  it('paginates with a stable total', async () => {
    const { body } = (await list(professorToken, { page: '2', perPage: '2' })) as {
      body: Listing<DisciplineResponseDto>;
    };
    expect(body).toMatchObject({ page: 2, perPage: 2, total: 3 });
    expect(body.data.map(({ code }) => code)).toEqual(['C1']);
    expect(await listCodes(professorToken, { page: '9' })).toEqual([]);
  });

  it('sorts by an allowed field', async () => {
    const query = { sortField: 'code', sortDirection: 'desc' };
    expect(await listCodes(professorToken, query)).toEqual(['C1', 'B1', 'A1']);
  });

  it.each([
    [{ semester: '2026.2' }, ['B1', 'C1']],
    [{ search: 'alg' }, ['A1']],
    [{ search: 'c1' }, ['C1']],
    [{ search: '_' }, ['B1']],
    [{ search: '%' }, []],
    [{ search: 'design' }, []],
  ])('filters by %j without leaking other disciplines', async (filter, codes) => {
    expect(await listCodes(professorToken, { filter: JSON.stringify(filter) })).toEqual(codes);
  });

  it.each([
    [{ page: '0' }],
    [{ page: 'abc' }],
    [{ perPage: '101' }],
    [{ sortField: 'professorId' }],
    [{ sortDirection: 'up' }],
    [{ filter: 'not-json' }],
    [{ filter: '[]' }],
    [{ filter: '{"professorId":"x"}' }],
    [{ filter: '{"search":{"a":1}}' }],
  ] as Array<[Record<string, string>]>)('rejects %j', async (query) => {
    const response = await list(professorToken, query);
    expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('requires authentication', async () => {
    const response = await request(app.getHttpServer()).get('/disciplines');
    expect(response.body).toMatchObject({ statusCode: 401, code: 'UNAUTHORIZED' });
  });

  it('documents the listing and the errors in Swagger', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
    const responses = document.paths['/disciplines']?.get?.responses;
    expect(JSON.stringify(responses?.['200'])).toContain('DisciplineResponseDto');
    expect(JSON.stringify(responses?.['400'])).toContain('ApiErrorDto');
  });
});
