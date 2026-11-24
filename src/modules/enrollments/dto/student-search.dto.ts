import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Trim } from '@/common/decorators/trim.decorator';

export class StudentSearchDto {
  @ApiProperty({ minLength: 3, maxLength: 120, description: 'Parte do nome ou do e-mail' })
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MinLength(3, { message: i18nValidationMessage('validation.minLength') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  readonly search!: string;
}
