export abstract class StorageService {
  abstract readonly enabled: boolean;

  abstract upload(file: { key: string; body: Buffer; contentType: string }): Promise<void>;

  abstract remove({ key }: { key: string }): Promise<void>;

  abstract getSignedUrl({
    key,
    downloadName,
  }: {
    key: string;
    downloadName?: string;
  }): Promise<string>;
}
