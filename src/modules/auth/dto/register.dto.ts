import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { MaxBytes } from '@/common/decorators/max-bytes.decorator';
import { Trim } from '@/common/decorators/trim.decorator';
import { ROLES, type Role } from '@/common/types/role';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@/config/security.constants';

export class RegisterDto {
  @ApiProperty({ maxLength: 120 })
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  readonly name!: string;

  @ApiProperty({ format: 'email', maxLength: 255 })
  @Trim()
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  @MaxLength(255, { message: i18nValidationMessage('validation.maxLength') })
  readonly email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, description: 'Até 72 bytes', writeOnly: true })
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(PASSWORD_MIN_LENGTH, { message: i18nValidationMessage('validation.minLength') })
  @MaxBytes(PASSWORD_MAX_BYTES, { message: i18nValidationMessage('validation.maxBytes') })
  readonly password!: string;

  @ApiProperty({ enum: ROLES, description: 'Perfil autodeclarado' })
  @IsIn(ROLES, { message: i18nValidationMessage('validation.isIn') })
  readonly role!: Role;
}
