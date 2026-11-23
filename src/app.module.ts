import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
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
})
export class AppModule {}
