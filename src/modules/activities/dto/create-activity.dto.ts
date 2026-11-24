import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Trim } from '@/common/decorators/trim.decorator';

export const DATE_TIME_WITH_ZONE = /T.+(Z|[+-]\d{2}:\d{2})$/;

export class CreateActivityDto {
  @ApiProperty({ example: 'Lista 1', maxLength: 160 })
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(160, { message: i18nValidationMessage('validation.maxLength') })
  readonly title!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  @IsOptional()
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(2000, { message: i18nValidationMessage('validation.maxLength') })
  readonly description?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: i18nValidationMessage('validation.isDateString') })
  @Matches(DATE_TIME_WITH_ZONE, { message: i18nValidationMessage('validation.isDateString') })
  readonly dueAt?: string | null;
}
