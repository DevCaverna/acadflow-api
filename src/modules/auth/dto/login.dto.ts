import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MaxBytes } from '@/common/decorators/max-bytes.decorator';
import { PASSWORD_MAX_BYTES } from '@/config/security.constants';

export class LoginDto {
  @ApiProperty({ example: 'professor@acadflow.local' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  readonly email!: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxBytes(PASSWORD_MAX_BYTES, { message: i18nValidationMessage('validation.maxBytes') })
  readonly password!: string;
}
