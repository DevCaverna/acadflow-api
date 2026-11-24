import { ApiProperty } from '@nestjs/swagger';
import { type ApiError, ERROR_STATUS, type ErrorCode } from '@/common/types/api-error';

export class ApiErrorDto implements ApiError {
  @ApiProperty({ example: 400 })
  readonly statusCode!: number;

  @ApiProperty({ enum: Object.keys(ERROR_STATUS) })
  readonly code!: ErrorCode;

  @ApiProperty({ description: 'Mensagem traduzida conforme Accept-Language' })
  readonly message!: string;
}
