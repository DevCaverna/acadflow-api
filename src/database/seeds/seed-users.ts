import { hash } from 'bcryptjs';
import type { DataSource } from 'typeorm';
import type { Role } from '@/common/types/role';
import { BCRYPT_ROUNDS } from '@/config/security.constants';

const DEMO_USERS: ReadonlyArray<{ name: string; email: string; role: Role }> = [
  { name: 'Professor Demo', email: 'professor@acadflow.local', role: 'PROFESSOR' },
  { name: 'Aluno Demo', email: 'aluno@acadflow.local', role: 'ALUNO' },
  { name: 'Aluna Demo', email: 'aluna@acadflow.local', role: 'ALUNO' },
];

export async function seedUsers(dataSource: DataSource, password: string): Promise<void> {
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  for (const { name, email, role } of DEMO_USERS) {
    await dataSource.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(email)) DO NOTHING`,
      [name, email, passwordHash, role],
    );
  }
}
