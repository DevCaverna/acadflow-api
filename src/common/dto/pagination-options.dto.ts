import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[number];

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const MAX_PAGE = 1_000_000;

function parseJson({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export class PaginationOptionsDto<Filter extends object> {
  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(MAX_PAGE, { message: i18nValidationMessage('validation.max') })
  readonly page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: MAX_PER_PAGE,
    default: DEFAULT_PER_PAGE,
  })
  @Type(() => Number)
  @IsInt({ message: i18nValidationMessage('validation.isInt') })
  @Min(1, { message: i18nValidationMessage('validation.min') })
  @Max(MAX_PER_PAGE, { message: i18nValidationMessage('validation.max') })
  readonly perPage: number = DEFAULT_PER_PAGE;

  @ApiPropertyOptional({ type: String, description: 'Filtros em JSON' })
  @IsOptional()
  @Transform(parseJson)
  @IsObject({ message: i18nValidationMessage('validation.isObject') })
  readonly filter?: Filter;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  readonly sortField?: string;

  @ApiPropertyOptional({ enum: SORT_DIRECTIONS, default: 'asc' })
  @IsIn(SORT_DIRECTIONS, { message: i18nValidationMessage('validation.isIn') })
  readonly sortDirection: SortDirection = 'asc';
}
