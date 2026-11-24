import { join } from 'node:path';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { ApiExceptionFilter } from '@/common/filters/api-exception.filter';
import { ApiException } from '@/common/filters/api.exception';
import { getDatabaseOptions } from '@/config/database.config';
import { HealthModule } from '@/modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: getDatabaseOptions }),
    I18nModule.forRoot({
      fallbackLanguage: process.env.I18N_FALLBACK_LANGUAGE ?? 'pt-BR',
      loaderOptions: { path: join(__dirname, 'i18n'), watch: false },
      resolvers: [AcceptLanguageResolver],
    }),
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          transform: true,
          validationError: { target: false, value: false },
          exceptionFactory: (errors) => new ApiException('VALIDATION_ERROR', errors),
        }),
    },
  ],
})
export class AppModule {}
