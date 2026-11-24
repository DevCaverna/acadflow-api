import { hash } from 'bcryptjs';
import { isEmail } from 'class-validator';
import type { DataSource } from 'typeorm';
import { type Role, ROLES } from '@/common/types/role';
import {
  BCRYPT_ROUNDS,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from '@/config/security.constants';

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export async function createUser({
  dataSource,
  name = '',
  email = '',
  role = '',
  password = '',
}: {
  dataSource: DataSource;
  name?: string;
  email?: string;
  role?: string;
  password?: string;
}): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length > 120) throw new Error('Invalid --name');
  if (!isEmail(email) || email.length > 255) throw new Error('Invalid --email');
  if (!isRole(role)) throw new Error(`Invalid --role, use ${ROLES.join(' or ')}`);
  if (password.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(password) > PASSWORD_MAX_BYTES) {
    throw new Error('USER_PASSWORD must have at least 8 characters and at most 72 bytes');
  }
  const rows: unknown[] = await dataSource.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
     ON CONFLICT (lower(email)) DO NOTHING RETURNING id`,
    [trimmedName, email.toLowerCase(), await hash(password, BCRYPT_ROUNDS), role],
  );
  if (rows.length === 0) throw new Error('A user with this email already exists');
}
