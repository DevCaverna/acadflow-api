import { ApiException } from '@/common/filters/api.exception';
import { StorageService } from '@/modules/storage/storage.service';

export class DisabledStorageService extends StorageService {
  readonly enabled = false;

  upload(): Promise<void> {
    return Promise.reject(new ApiException('STORAGE_UNAVAILABLE'));
  }

  remove(): Promise<void> {
    return Promise.reject(new ApiException('STORAGE_UNAVAILABLE'));
  }

  getSignedUrl(): Promise<string> {
    return Promise.reject(new ApiException('STORAGE_UNAVAILABLE'));
  }
}
