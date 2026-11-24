import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import type { Role } from '@/common/types/role';
import { seedAcademicData } from '@/database/seeds/seed-academic-data';
import { seedUsers } from '@/database/seeds/seed-users';
import type { ActivityResponseDto } from '@/modules/activities/dto/activity-response.dto';
import type { StudentGradesDto } from '@/modules/grades/dto/grade-summary.dto';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

type Account = { id: string; email: string; token: string };
type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

describe('Activities, enrollments and grades', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let owner: Account;
  let otherProfessor: Account;
  let student: Account;
  let classmate: Account;
  let outsider: Account;
  let disciplineId: string;

  async function insert(sql: string, params: unknown[]): Promise<string> {
    const rows: Array<{ id: string }> = await dataSource.query(`${sql} RETURNING id`, params);
    return rows[0].id;
  }

  async function createUser(role: Role, name: string): Promise<Account> {
    const email = `${randomUUID()}@example.com`;
    const id = await insert(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, 'x', $3)`,
      [name, email, role],
    );
    return { id, email, token: await app.get(JwtService).signAsync({ sub: id }) };
  }

  function call(account: Account, method: Method, path: string, body?: object) {
    return request(app.getHttpServer())
      [method](path)
      .auth(account.token, { type: 'bearer' })
      .send(body);
  }

  async function createActivity(body: object = {}): Promise<ActivityResponseDto> {
    const response = await call(owner, 'post', `/disciplines/${disciplineId}/activities`, {
      title: 'Test',
      ...body,
    }).expect(201);
    return response.body as ActivityResponseDto;
  }

  async function grade(activityId: string, account: Account, value: number): Promise<void> {
    await call(owner, 'put', `/activities/${activityId}/grades/${account.id}`, { value }).expect(
      200,
    );
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query(
      'TRUNCATE activity_attachments, grades, activities, enrollments, disciplines, users',
    );
    [owner, otherProfessor, student, classmate, outsider] = await Promise.all([
      createUser('PROFESSOR', 'Owner'),
      createUser('PROFESSOR', 'Other'),
      createUser('ALUNO', 'Bia'),
      createUser('ALUNO', 'Ana'),
      createUser('ALUNO', 'Out'),
    ]);
    disciplineId = await insert(
      `INSERT INTO disciplines (code, name, semester, professor_id) VALUES ('T1', 'Test', '2026.2', $1)`,
      [owner.id],
    );
    for (const { id } of [student, classmate]) {
      await dataSource.query(
        'INSERT INTO enrollments (student_id, discipline_id) VALUES ($1, $2)',
        [id, disciplineId],
      );
    }
  });

  afterAll(async () => {
    await dataSource?.query(
      'TRUNCATE activity_attachments, grades, activities, enrollments, disciplines, users',
    );
    await app?.close();
  });

  it('lists enrolled students only to the professor of the discipline', async () => {
    const path = `/disciplines/${disciplineId}/students`;
    const response = await call(owner, 'get', path).expect(200);
    expect(response.body).toEqual([
      { id: classmate.id, name: 'Ana', email: classmate.email },
      { id: student.id, name: 'Bia', email: student.email },
    ]);
    await call(otherProfessor, 'get', path).expect(403);
    await call(student, 'get', path).expect(403);
    await call(owner, 'get', `/disciplines/${randomUUID()}/students`).expect(404);
  });

  describe('manual enrollments', () => {
    const path = (studentId = '') => `/disciplines/${disciplineId}/students/${studentId}`;

    it('searches only students that are not enrolled', async () => {
      const search = (term: string) =>
        call(owner, 'get', `${path('candidates')}?search=${encodeURIComponent(term)}`);
      expect((await search('out').expect(200)).body).toEqual([
        { id: outsider.id, name: 'Out', email: outsider.email },
      ]);
      expect((await search('Other').expect(200)).body).toEqual([]);
      expect((await search(student.email).expect(200)).body).toEqual([]);
      expect((await search('%%%').expect(200)).body).toEqual([]);
      await search('ou').expect(400);
      await call(owner, 'get', path('candidates')).expect(400);
    });

    it('enrolls once and gives access to the student', async () => {
      const response = await call(owner, 'post', path(outsider.id)).expect(201);
      expect(response.body).toEqual({ id: outsider.id, name: 'Out', email: outsider.email });
      await call(outsider, 'get', `/disciplines/${disciplineId}`).expect(200);
      const repeated = await call(owner, 'post', path(outsider.id));
      expect(repeated.body).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    });

    it('enrolls only existing students', async () => {
      await call(owner, 'post', path(otherProfessor.id)).expect(404);
      await call(owner, 'post', path(randomUUID())).expect(404);
    });

    it('removes a student without grades and keeps the history otherwise', async () => {
      const { id } = await createActivity();
      await grade(id, student, 7);
      const blocked = await call(owner, 'delete', path(student.id));
      expect(blocked.body).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
      await call(owner, 'delete', path(classmate.id)).expect(204);
      await call(owner, 'delete', path(classmate.id)).expect(404);
      await call(classmate, 'get', `/disciplines/${disciplineId}`).expect(403);
      const late = await call(owner, 'put', `/activities/${id}/grades/${classmate.id}`, {
        value: 5,
      });
      expect(late.body).toMatchObject({ code: 'STUDENT_NOT_ENROLLED' });
    });

    it('prevents students and other professors from managing enrollments', async () => {
      for (const account of [outsider, otherProfessor]) {
        await call(account, 'get', `${path('candidates')}?search=test`).expect(403);
        await call(account, 'post', path(outsider.id)).expect(403);
        await call(account, 'delete', path(student.id)).expect(403);
      }
    });
  });

  it('creates activities and lists them by due date to linked users', async () => {
    const open = await createActivity({ title: '  No date  ' });
    const late = await createActivity({ dueAt: '2026-12-02T12:00:00-03:00' });
    const soon = await createActivity({ dueAt: '2026-12-01T12:00:00Z', description: 'Read' });
    expect(open).toEqual({
      id: open.id,
      disciplineId,
      title: 'No date',
      description: null,
      dueAt: null,
    });
    expect(late.dueAt).toBe('2026-12-02T15:00:00.000Z');
    const path = `/disciplines/${disciplineId}/activities`;
    for (const account of [owner, student]) {
      expect((await call(account, 'get', path).expect(200)).body).toEqual([soon, late, open]);
    }
    await call(outsider, 'get', path).expect(403);
    await call(otherProfessor, 'get', path).expect(403);
  });

  it.each([
    [{ title: ' ' }],
    [{ title: 'x'.repeat(161) }],
    [{ description: 1 }],
    [{ dueAt: 'tomorrow' }],
    [{ dueAt: '2026-12-01' }],
    [{ dueAt: '2026-12-01T12:00:00' }],
    [{ dueAt: '2026-02-30T12:00:00Z' }],
  ])('rejects invalid activity %j', async (body) => {
    const response = await call(owner, 'post', `/disciplines/${disciplineId}/activities`, {
      title: 'Test',
      ...body,
    });
    expect(response.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });

  it('updates and removes activities', async () => {
    const created = await createActivity({ dueAt: '2026-12-01T12:00:00Z', description: 'Read' });
    const path = `/activities/${created.id}`;
    const updated = await call(owner, 'patch', path, { title: 'New', dueAt: null }).expect(200);
    expect(updated.body).toEqual(Object.assign({}, created, { title: 'New', dueAt: null }));
    expect((await call(owner, 'patch', path, {}).expect(200)).body).toEqual(updated.body);
    await call(owner, 'patch', path, { title: null }).expect(400);
    await call(owner, 'delete', path).expect(204);
    await call(owner, 'delete', path).expect(404);
  });

  it('keeps activities that have grades', async () => {
    const { id } = await createActivity();
    await grade(id, student, 8);
    const response = await call(owner, 'delete', `/activities/${id}`);
    expect(response.body).toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  it('prevents students and other professors from writing activities', async () => {
    const { id } = await createActivity();
    for (const account of [student, otherProfessor]) {
      await call(account, 'post', `/disciplines/${disciplineId}/activities`, {
        title: 'Hacked',
      }).expect(403);
      await call(account, 'patch', `/activities/${id}`, { title: 'Hacked' }).expect(403);
      await call(account, 'delete', `/activities/${id}`).expect(403);
    }
  });

  it('shows grades, average and status of every enrolled student to the professor', async () => {
    const first = await createActivity();
    const second = await createActivity();
    await grade(first.id, student, 8);
    await grade(second.id, student, 6);
    const path = `/disciplines/${disciplineId}/grades`;
    const response = await call(owner, 'get', path).expect(200);
    expect(response.body as StudentGradesDto[]).toEqual([
      {
        student: { id: classmate.id, name: 'Ana', email: classmate.email },
        grades: [],
        average: null,
        status: 'NO_GRADES',
      },
      {
        student: { id: student.id, name: 'Bia', email: student.email },
        grades: [
          { activityId: first.id, value: 8, updatedAt: expect.any(String) as string },
          { activityId: second.id, value: 6, updatedAt: expect.any(String) as string },
        ],
        average: 7,
        status: 'APPROVED',
      },
    ]);
    await call(otherProfessor, 'get', path).expect(403);
    await call(student, 'get', path).expect(403);
  });

  it('shows to the student only the own grades of that discipline', async () => {
    const { id } = await createActivity();
    await grade(id, student, 6);
    await grade(id, classmate, 2);
    const otherDiscipline = await insert(
      `INSERT INTO disciplines (code, name, semester, professor_id) VALUES ('T2', 'X', '2026.2', $1)`,
      [owner.id],
    );
    const otherActivity = await insert(
      `INSERT INTO activities (discipline_id, title) VALUES ($1, 'X')`,
      [otherDiscipline],
    );
    await insert('INSERT INTO grades (student_id, activity_id, value) VALUES ($1, $2, 10)', [
      student.id,
      otherActivity,
    ]);
    const path = `/disciplines/${disciplineId}/grades/me`;
    expect((await call(student, 'get', path).expect(200)).body).toEqual({
      grades: [{ activityId: id, value: 6, updatedAt: expect.any(String) as string }],
      average: 6,
      status: 'RECOVERY',
    });
    await call(outsider, 'get', path).expect(403);
    await call(owner, 'get', path).expect(403);
  });

  it('seeds the academic data repeatedly without duplicates', async () => {
    for (let run = 0; run < 2; run++) {
      await seedUsers(dataSource, 'test-password');
      await seedAcademicData(dataSource);
    }
    const [counts]: Array<Record<string, number>> = await dataSource.query(
      `SELECT count(DISTINCT d.id)::int AS disciplines, count(DISTINCT a.id)::int AS activities,
         count(DISTINCT e.student_id)::int AS students
       FROM disciplines d JOIN activities a ON a.discipline_id = d.id
       JOIN enrollments e ON e.discipline_id = d.id WHERE d.code = 'BD-204'`,
    );
    expect(counts).toEqual({ disciplines: 1, activities: 2, students: 2 });
  });
});
