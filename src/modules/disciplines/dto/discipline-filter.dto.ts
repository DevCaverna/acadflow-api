import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export const DISCIPLINE_SORT_FIELDS = ['code', 'name', 'semester'] as const;

export type DisciplineSortField = (typeof DISCIPLINE_SORT_FIELDS)[number];

export class DisciplineFilterDto {
  @ApiPropertyOptional({ description: 'Parte do nome ou do código' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  readonly search?: string;

  @ApiPropertyOptional({ example: '2026.2' })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(7, { message: i18nValidationMessage('validation.maxLength') })
  readonly semester?: string;
}
