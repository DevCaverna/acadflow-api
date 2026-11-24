import { StorageService } from '@/modules/storage/storage.service';

export class MemoryStorageService extends StorageService {
  readonly enabled = true;
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();

  upload({
    key,
    body,
    contentType,
  }: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    this.objects.set(key, { body, contentType });
    return Promise.resolve();
  }

  remove({ key }: { key: string }): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  getSignedUrl({ key, downloadName }: { key: string; downloadName?: string }): Promise<string> {
    return Promise.resolve(`https://storage.test/${key}?name=${downloadName ?? ''}`);
  }
}
