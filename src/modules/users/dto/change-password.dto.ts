import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MaxBytes } from '@/common/decorators/max-bytes.decorator';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@/config/security.constants';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxBytes(PASSWORD_MAX_BYTES, { message: i18nValidationMessage('validation.maxBytes') })
  readonly currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, description: 'Até 72 bytes' })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(PASSWORD_MIN_LENGTH, { message: i18nValidationMessage('validation.minLength') })
  @MaxBytes(PASSWORD_MAX_BYTES, { message: i18nValidationMessage('validation.maxBytes') })
  readonly newPassword!: string;
}
