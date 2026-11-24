import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ApiBodyOptions } from '@nestjs/swagger';
import { ApiException } from '@/common/filters/api.exception';

export const FILE_BODY: ApiBodyOptions = {
  schema: {
    type: 'object',
    required: ['file'],
    properties: { file: { type: 'string', format: 'binary' } },
  },
};

@Injectable()
export class RequiredFilePipe implements PipeTransform<
  Express.Multer.File | undefined,
  Express.Multer.File
> {
  transform(file: Express.Multer.File | undefined): Express.Multer.File {
    if (!file || file.size === 0) throw new ApiException('VALIDATION_ERROR');
    return file;
  }
}
