import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import sharp from 'sharp';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '@/app.module';
import type { Role } from '@/common/types/role';
import type { AttachmentResponseDto } from '@/modules/activities/dto/attachment-response.dto';
import { StorageService } from '@/modules/storage/storage.service';
import { MemoryStorageService } from '@test/support/mocks/memory-storage.service';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

type Account = { id: string; token: string };
type Method = 'get' | 'post' | 'delete';

const PDF = Buffer.from('%PDF-1.7 test');

describe('Files', () => {
  const storage = new MemoryStorageService();
  let app: INestApplication<App>;
  let disabledApp: INestApplication<App>;
  let dataSource: DataSource;
  let png: Buffer;
  let owner: Account;
  let otherProfessor: Account;
  let student: Account;
  let outsider: Account;
  let activityId: string;

  async function insert(sql: string, params: unknown[]): Promise<string> {
    const rows: Array<{ id: string }> = await dataSource.query(`${sql} RETURNING id`, params);
    return rows[0].id;
  }

  async function createUser(role: Role): Promise<Account> {
    const id = await insert(
      `INSERT INTO users (name, email, password_hash, role) VALUES ('Test', $1, 'x', $2)`,
      [`${randomUUID()}@example.com`, role],
    );
    return { id, token: await app.get(JwtService).signAsync({ sub: id }) };
  }

  function call(account: Account, method: Method, path: string, target = app) {
    return request(target.getHttpServer())[method](path).auth(account.token, { type: 'bearer' });
  }

  function attach(account: Account, body: Buffer, name: string) {
    return call(account, 'post', `/activities/${activityId}/attachments`).attach(
      'file',
      body,
      name,
    );
  }

  function avatar(body: Buffer) {
    return call(student, 'post', '/users/me/avatar').attach('file', body, 'photo.png');
  }

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue(storage)
      .compile();
    app = module.createNestApplication();
    await app.init();
    const disabledModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    disabledApp = disabledModule.createNestApplication();
    await disabledApp.init();
    dataSource = app.get(DataSource);
    png = await sharp({
      create: { width: 400, height: 300, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
  });

  beforeEach(async () => {
    storage.objects.clear();
    await dataSource.query(
      'TRUNCATE activity_attachments, grades, activities, enrollments, disciplines, users',
    );
    [owner, otherProfessor, student, outsider] = await Promise.all([
      createUser('PROFESSOR'),
      createUser('PROFESSOR'),
      createUser('ALUNO'),
      createUser('ALUNO'),
    ]);
    const disciplineId = await insert(
      `INSERT INTO disciplines (code, name, semester, professor_id) VALUES ('F1', 'X', '2026.2', $1)`,
      [owner.id],
    );
    activityId = await insert(`INSERT INTO activities (discipline_id, title) VALUES ($1, 'X')`, [
      disciplineId,
    ]);
    await dataSource.query('INSERT INTO enrollments (student_id, discipline_id) VALUES ($1, $2)', [
      student.id,
      disciplineId,
    ]);
  });

  afterAll(async () => {
    await dataSource?.query(
      'TRUNCATE activity_attachments, grades, activities, enrollments, disciplines, users',
    );
    await app?.close();
    await disabledApp?.close();
  });

  it('converts the avatar to webp, replaces the previous one and removes it', async () => {
    const first = await avatar(png).expect(200);
    expect(first.body).toMatchObject({
      avatarUrl: expect.stringContaining(`avatars/${student.id}/`) as string,
    });
    const [[firstKey, stored]] = [...storage.objects];
    expect(await sharp(stored.body).metadata()).toMatchObject({
      format: 'webp',
      width: 256,
      height: 256,
    });

    await avatar(png).expect(200);
    expect(storage.objects.size).toBe(1);
    expect(storage.objects.has(firstKey)).toBe(false);

    await call(student, 'delete', '/users/me/avatar').expect(204);
    expect(storage.objects.size).toBe(0);
    const me = await call(student, 'get', '/auth/me').expect(200);
    expect(me.body).toMatchObject({ avatarUrl: null });
    await call(student, 'delete', '/users/me/avatar').expect(204);
  });

  it('rejects invalid avatars', async () => {
    await avatar(PDF).expect(400);
    await avatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')).expect(400);
    await avatar(png.subarray(0, 60)).expect(400);
    await avatar(Buffer.alloc(0)).expect(400);
    await call(student, 'post', '/users/me/avatar').expect(400);
    const large = await avatar(Buffer.alloc(2 * 1024 * 1024 + 1));
    expect(large.body).toMatchObject({ statusCode: 413, code: 'VALIDATION_ERROR' });
    expect(storage.objects.size).toBe(0);
  });

  it('lets the professor attach and the enrolled student download', async () => {
    const created = await attach(owner, PDF, 'Lista ção.pdf').expect(201);
    const attachment = created.body as AttachmentResponseDto;
    expect(attachment).toMatchObject({
      name: 'Lista ção.pdf',
      mimeType: 'application/pdf',
      sizeBytes: PDF.length,
    });
    expect(Object.keys(attachment).sort()).toEqual([
      'id',
      'mimeType',
      'name',
      'sizeBytes',
      'uploadedAt',
    ]);
    await attach(owner, png, 'image.PNG').expect(201);

    const list = await call(student, 'get', `/activities/${activityId}/attachments`).expect(200);
    expect(list.body).toHaveLength(2);
    const url = await call(student, 'get', `/attachments/${attachment.id}/url`).expect(200);
    expect(url.body).toEqual({
      url: expect.stringContaining('Lista ção.pdf') as string,
    });

    await call(owner, 'delete', `/attachments/${attachment.id}`).expect(204);
    expect(storage.objects.size).toBe(1);
    await call(student, 'get', `/attachments/${attachment.id}/url`).expect(404);
  });

  it.each([
    ['page.html', Buffer.from('<html></html>')],
    ['fake.pdf', Buffer.from('not a pdf')],
    ['image.pdf', undefined],
    ['script.exe', PDF],
    ['empty.pdf', Buffer.alloc(0)],
  ])('rejects attachment %s', async (name, body) => {
    await attach(owner, body ?? png, name).expect(400);
    expect(storage.objects.size).toBe(0);
  });

  it('rejects attachments above the limit', async () => {
    await attach(owner, Buffer.alloc(10 * 1024 * 1024 + 1), 'big.pdf').expect(413);
  });

  it('protects attachments from users without access', async () => {
    const { id } = (await attach(owner, PDF, 'a.pdf').expect(201)).body as AttachmentResponseDto;
    for (const account of [outsider, otherProfessor]) {
      await call(account, 'get', `/activities/${activityId}/attachments`).expect(403);
      await call(account, 'get', `/attachments/${id}/url`).expect(403);
    }
    for (const account of [student, otherProfessor]) {
      await attach(account, PDF, 'b.pdf').expect(403);
      await call(account, 'delete', `/attachments/${id}`).expect(403);
    }
    await request(app.getHttpServer()).get(`/attachments/${id}/url`).expect(401);
    expect(storage.objects.size).toBe(1);
  });

  it('keeps activities that have attachments', async () => {
    await attach(owner, PDF, 'a.pdf').expect(201);
    await call(owner, 'delete', `/activities/${activityId}`).expect(409);
  });

  it('reports unavailable storage without R2', async () => {
    const response = await call(student, 'post', '/users/me/avatar', disabledApp).attach(
      'file',
      png,
      'photo.png',
    );
    expect(response.body).toMatchObject({ statusCode: 503, code: 'STORAGE_UNAVAILABLE' });
  });
});
