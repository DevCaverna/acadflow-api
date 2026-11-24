import { applyDecorators, type HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorDto } from '@/common/dto/api-error.dto';

export const ApiErrors = (...statuses: HttpStatus[]) =>
  applyDecorators(...statuses.map((status) => ApiResponse({ status, type: ApiErrorDto })));
