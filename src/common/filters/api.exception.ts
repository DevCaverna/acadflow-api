import { HttpException, type ValidationError } from '@nestjs/common';
import { ERROR_STATUS, type ErrorCode } from '@/common/types/api-error';

export class ApiException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    readonly validationErrors: readonly ValidationError[] = [],
  ) {
    super(code, ERROR_STATUS[code]);
  }
}
