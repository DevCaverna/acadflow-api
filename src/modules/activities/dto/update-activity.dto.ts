import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Trim } from '@/common/decorators/trim.decorator';
import { DATE_TIME_WITH_ZONE } from '@/modules/activities/dto/create-activity.dto';

export class UpdateActivityDto {
  @ApiPropertyOptional({ maxLength: 160 })
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(160, { message: i18nValidationMessage('validation.maxLength') })
  readonly title?: string;

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
