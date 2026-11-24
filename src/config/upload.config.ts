import type { ConfigService } from '@nestjs/config';
import type { MulterModuleOptions } from '@nestjs/platform-express';

export function getUploadOptions({
  config,
  key,
  defaultBytes,
}: {
  config: ConfigService;
  key: string;
  defaultBytes: number;
}): MulterModuleOptions {
  const configured = Number(config.get<string>(key));
  const fileSize = Number.isInteger(configured) && configured > 0 ? configured : defaultBytes;
  return { limits: { fileSize, files: 1 } };
}
