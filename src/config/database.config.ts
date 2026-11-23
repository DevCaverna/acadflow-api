import { join } from 'node:path';
import type { DataSourceOptions } from 'typeorm';

export function getDatabaseOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    ssl: process.env.DB_SSL === 'true',
    entities: [join(__dirname, '../modules/**/*.entity.{ts,js}')],
    migrations: [join(__dirname, '../database/migrations/*.{ts,js}')],
    synchronize: false,
    migrationsRun: false,
  };
}
