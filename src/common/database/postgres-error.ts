import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATIONS = ['23503', '23001'];

function getCode(error: unknown): string | undefined {
  if (!(error instanceof QueryFailedError)) return undefined;
  const { code } = error.driverError as Error & { code?: string };
  return code;
}

export function isUniqueViolation(error: unknown): boolean {
  return getCode(error) === UNIQUE_VIOLATION;
}

export function isForeignKeyViolation(error: unknown): boolean {
  return FOREIGN_KEY_VIOLATIONS.includes(getCode(error) ?? '');
}
