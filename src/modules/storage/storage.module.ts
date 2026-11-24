import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DisabledStorageService } from '@/modules/storage/adapters/disabled-storage.service';
import { R2StorageService } from '@/modules/storage/adapters/r2-storage.service';
import { StorageService } from '@/modules/storage/storage.service';

@Module({
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService =>
        config.get<string>('R2_ENABLED') === 'true'
          ? new R2StorageService({
              endpoint: config.getOrThrow<string>('R2_ENDPOINT'),
              bucket: config.getOrThrow<string>('R2_BUCKET_NAME'),
              accessKeyId: config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
              secretAccessKey: config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
            })
          : new DisabledStorageService(),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
