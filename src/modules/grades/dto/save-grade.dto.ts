import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class SaveGradeDto {
  @ApiProperty({ minimum: 0, maximum: 10, multipleOf: 0.1 })
  @IsNumber({ maxDecimalPlaces: 1 }, { message: i18nValidationMessage('validation.isNumber') })
  @Min(0, { message: i18nValidationMessage('validation.min') })
  @Max(10, { message: i18nValidationMessage('validation.max') })
  readonly value!: number;
}
