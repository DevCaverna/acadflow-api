import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  type INestApplication,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail, IsNotEmpty, IsString, Max } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { ApiException } from '@/common/filters/api.exception';
import { ERROR_STATUS, type ErrorCode } from '@/common/types/api-error';
import { getWorkerDatabaseName } from '@test/support/setup/worker-database';

class LoginStubDto {
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  readonly email!: string;

  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  readonly password!: string;
}

class GradeStubDto {
  @Max(10, { message: i18nValidationMessage('validation.max') })
  readonly value!: number;
}

class UntranslatedStubDto {
  @IsString()
  readonly name!: string;
}

@Controller('stub')
class StubController {
  @Get('code/:code')
  fail(@Param('code') code: ErrorCode): never {
    throw new ApiException(code);
  }

  @Get('forbidden')
  forbidden(): never {
    throw new ForbiddenException('internal guard detail');
  }

  @Get('crash')
  crash(): never {
    throw new Error('secret database detail');
  }

  @Post('login')
  login(@Body() body: LoginStubDto): LoginStubDto {
    return body;
  }

  @Post('grade')
  grade(@Body() body: GradeStubDto): GradeStubDto {
    return body;
  }

  @Post('untranslated')
  untranslated(@Body() body: UntranslatedStubDto): UntranslatedStubDto {
    return body;
  }
}

describe('Localized errors', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.DB_DATABASE = getWorkerDatabaseName();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [StubController],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    vi.restoreAllMocks();
  });

  it.each([
    [undefined, 'Credenciais inválidas'],
    ['pt-BR', 'Credenciais inválidas'],
    ['pt', 'Credenciais inválidas'],
    ['es', 'Credenciais inválidas'],
    ['en', 'Invalid credentials'],
    ['en-US,en;q=0.9,pt-BR;q=0.5', 'Invalid credentials'],
  ])('resolves Accept-Language %s', async (language, message) => {
    const call = request(app.getHttpServer()).get('/stub/code/INVALID_CREDENTIALS');
    if (language) void call.set('Accept-Language', language);
    const response = await call;
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ statusCode: 401, code: 'INVALID_CREDENTIALS', message });
  });

  it.each(Object.entries(ERROR_STATUS))(
    'keeps %s status and code in both languages',
    async (code, status) => {
      const messages: string[] = [];
      for (const language of ['pt-BR', 'en']) {
        const response = await request(app.getHttpServer())
          .get(`/stub/code/${code}`)
          .set('Accept-Language', language);
        expect(response.status).toBe(status);
        expect(response.body).toMatchObject({ statusCode: status, code });
        messages.push((response.body as { message: string }).message);
      }
      expect(messages[0]).not.toBe(messages[1]);
      expect(messages.join()).not.toContain('errors.');
    },
  );

  it.each([
    ['pt-BR', 'O campo e-mail deve ser um e-mail válido; O campo senha é obrigatório'],
    ['en', 'The email field must be a valid email; The password field is required'],
  ])('translates validation messages to %s', async (language, message) => {
    const response = await request(app.getHttpServer())
      .post('/stub/login')
      .set('Accept-Language', language)
      .send({ email: 'private|{value', password: '' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', message });
  });

  it('interpolates constraint limits', async () => {
    const response = await request(app.getHttpServer())
      .post('/stub/grade')
      .set('Accept-Language', 'en')
      .send({ value: 11 });
    expect(response.body).toMatchObject({ message: 'The grade field must be at most 10' });
  });

  it.each([
    ['post', '/stub/untranslated', 400, 'VALIDATION_ERROR', 'Invalid data'],
    ['get', '/stub/forbidden', 403, 'FORBIDDEN', 'Access denied'],
    ['get', '/stub/crash', 500, 'INTERNAL_ERROR', 'An unexpected error occurred'],
    ['get', '/missing', 404, 'NOT_FOUND', 'Resource not found'],
  ] as const)('hides internal details: %s %s', async (method, path, statusCode, code, message) => {
    const response = await request(app.getHttpServer())[method](path).set('Accept-Language', 'en');
    expect(response.status).toBe(statusCode);
    expect(response.body).toEqual({ statusCode, code, message });
  });

  it.each([
    [undefined, 'Dados inválidos'],
    ['en', 'Invalid data'],
  ])('translates malformed JSON with Accept-Language %s', async (language, message) => {
    const call = request(app.getHttpServer())
      .post('/stub/login')
      .set('Content-Type', 'application/json');
    if (language) void call.set('Accept-Language', language);
    const response = await call.send('{"email":');
    expect(response.body).toEqual({ statusCode: 400, code: 'VALIDATION_ERROR', message });
  });

  it('keeps the status of payloads that are too large', async () => {
    const response = await request(app.getHttpServer())
      .post('/stub/login')
      .set('Accept-Language', 'en')
      .send({ email: 'x'.repeat(200_000) });
    expect(response.body).toEqual({
      statusCode: 413,
      code: 'VALIDATION_ERROR',
      message: 'Invalid data',
    });
  });
});
