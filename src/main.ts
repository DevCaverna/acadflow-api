import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '@/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('AcadFlow API')
    .setDescription(
      'API REST de gestão acadêmica do AcadFlow para professores e alunos (disciplinas, matrículas, atividades, anexos, notas e perfil). Autenticação via Bearer JWT, internacionalização via header Accept-Language (pt-BR padrão, en alternativo) e erros padronizados em ApiErrorDto.',
    )
    .setVersion('0.1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Token JWT retornado por POST /auth/login',
    })
    .addTag('health', 'Verificação de saúde da API e do banco de dados')
    .addTag('auth', 'Autenticação JWT e consulta da sessão atual')
    .addTag('users', 'Consulta e atualização do próprio perfil, senha e avatar')
    .addTag('disciplines', 'Gestão e listagem paginada de disciplinas')
    .addTag('enrollments', 'Consulta, matrícula e remoção manual de alunos por disciplina')
    .addTag('activities', 'Gestão de atividades vinculadas às disciplinas')
    .addTag('attachments', 'Upload, listagem, URL assinada e remoção de anexos de atividades')
    .addTag('grades', 'Lançamento, remoção e consulta de notas, médias e situações acadêmicas')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config), {
    customSiteTitle: 'AcadFlow API — Swagger',
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
