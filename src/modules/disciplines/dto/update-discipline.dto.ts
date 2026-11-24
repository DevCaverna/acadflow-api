import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { Trim } from '@/common/decorators/trim.decorator';

export class UpdateDisciplineDto {
  @ApiPropertyOptional({ example: 'Banco de Dados', maxLength: 120 })
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.isNotEmpty') })
  @MaxLength(120, { message: i18nValidationMessage('validation.maxLength') })
  readonly name?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 2000,
    description: 'null remove a descrição',
  })
  @IsOptional()
  @Trim()
  @IsString({ message: i18nValidationMessage('validation.isString') })
  @MaxLength(2000, { message: i18nValidationMessage('validation.maxLength') })
  readonly description?: string | null;
}
