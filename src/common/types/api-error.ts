import { HttpStatus } from '@nestjs/common';

export const ERROR_STATUS = {
  VALIDATION_ERROR: HttpStatus.BAD_REQUEST,
  INVALID_CURRENT_PASSWORD: HttpStatus.BAD_REQUEST,
  INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,
  UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  STUDENT_NOT_ENROLLED: HttpStatus.UNPROCESSABLE_ENTITY,
  TOO_MANY_REQUESTS: HttpStatus.TOO_MANY_REQUESTS,
  INTERNAL_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ApiError = {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly message: string;
};
