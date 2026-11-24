import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Trim } from '@/common/decorators/trim.decorator';

export class CreateDisciplineDto {
  @ApiProperty({ example: 'BD-204', maxLength: 20 })
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(20, { message: i18nValidationMessage('validation.maxLength') })
  readonly code!: string;

  @ApiProperty({ example: 'Banco de Dados', maxLength: 120 })
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  readonly name!: string;

  @ApiProperty({ example: '2026.2', pattern: '^\\d{4}\\.[12]$' })
  @Matches(/^\d{4}\.[12]$/, { message: i18nValidationMessage('validation.semester') })
  readonly semester!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(2000, { message: i18nValidationMessage('validation.maxLength') })
  readonly description?: string | null;
}
