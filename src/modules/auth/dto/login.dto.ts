import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @ApiProperty({ example: 'professor@acadflow.local' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: i18nValidationMessage('validation.isEmail') })
  readonly email!: string;

  @ApiProperty()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(72, { message: i18nValidationMessage('validation.maxLength') })
  readonly password!: string;
}
