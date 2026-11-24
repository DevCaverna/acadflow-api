import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { DataSource } from 'typeorm';
import { getDatabaseOptions } from '@/config/database.config';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default new DataSource(getDatabaseOptions());
