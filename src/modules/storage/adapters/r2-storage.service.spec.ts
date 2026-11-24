import { describe, expect, it } from 'vitest';
import { R2StorageService } from '@/modules/storage/adapters/r2-storage.service';

describe('R2StorageService', () => {
  const storage = new R2StorageService({
    endpoint: 'https://account.r2.cloudflarestorage.com',
    bucket: 'acadflow-test',
    accessKeyId: 'fake-id',
    secretAccessKey: 'fake-secret',
  });

  it('creates a short signed url without exposing the secret', async () => {
    const url = new URL(await storage.getSignedUrl({ key: 'avatars/a.webp' }));
    expect(url.href).toContain('acadflow-test');
    expect(url.pathname).toContain('avatars/a.webp');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.href).not.toContain('fake-secret');
  });

  it('forces download with the original name', async () => {
    const url = new URL(await storage.getSignedUrl({ key: 'x', downloadName: 'lista ção.pdf' }));
    expect(url.searchParams.get('response-content-disposition')).toBe(
      "attachment; filename*=UTF-8''lista%20%C3%A7%C3%A3o.pdf",
    );
  });
});
