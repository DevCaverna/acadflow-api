import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Trim } from '@/common/decorators/trim.decorator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  readonly name?: string;

  @ApiPropertyOptional({ format: 'email', maxLength: 255 })
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Trim()
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  @MaxLength(255, { message: i18nValidationMessage('validation.maxLength') })
  readonly email?: string;
}
