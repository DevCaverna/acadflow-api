import { Injectable, type PipeTransform, type Type } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { PaginationOptionsDto } from '@/common/dto/pagination-options.dto';
import { ApiException } from '@/common/filters/api.exception';

@Injectable()
export class ValidatePaginationPipe<Filter extends object> implements PipeTransform<
  PaginationOptionsDto<Filter>,
  Promise<PaginationOptionsDto<Filter>>
> {
  constructor(
    private readonly filterType: Type<Filter>,
    private readonly sortFields: readonly string[],
  ) {}

  async transform(options: PaginationOptionsDto<Filter>): Promise<PaginationOptionsDto<Filter>> {
    if (options.sortField !== undefined && !this.sortFields.includes(options.sortField)) {
      throw new ApiException('VALIDATION_ERROR');
    }
    if (!options.filter) return options;

    const filter = plainToInstance(this.filterType, options.filter);
    const errors = await validate(filter, {
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      validationError: { target: false, value: false },
    });
    if (errors.length > 0) throw new ApiException('VALIDATION_ERROR', errors);
    return Object.assign(options, { filter });
  }
}
