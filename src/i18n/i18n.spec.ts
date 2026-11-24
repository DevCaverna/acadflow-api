import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ERROR_STATUS } from '@/common/types/api-error';

function load(lang: string, file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(__dirname, lang, file), 'utf8')) as Record<string, unknown>;
}

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, item]) =>
    typeof item === 'object' && item !== null
      ? flatten(item as Record<string, unknown>, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('translations', () => {
  const files = readdirSync(join(__dirname, 'pt-BR'));

  it('has the same files in both languages', () => {
    expect(readdirSync(join(__dirname, 'en'))).toEqual(files);
  });

  it.each(files)('has the same keys in both languages: %s', (file) => {
    expect(flatten(load('en', file)).sort()).toEqual(flatten(load('pt-BR', file)).sort());
  });

  it('translates every error code', () => {
    expect(Object.keys(load('en', 'errors.json')).sort()).toEqual(Object.keys(ERROR_STATUS).sort());
  });
});
