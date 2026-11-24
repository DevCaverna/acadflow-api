import { applyDecorators, HttpStatus, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { Listing } from '@/common/dto/listing.dto';

export const ApiListingResponse = (item: Type<unknown>) =>
  applyDecorators(
    ApiExtraModels(Listing, item),
    ApiResponse({
      status: HttpStatus.OK,
      schema: {
        allOf: [
          { $ref: getSchemaPath(Listing) },
          {
            required: ['data'],
            properties: { data: { type: 'array', items: { $ref: getSchemaPath(item) } } },
          },
        ],
      },
    }),
  );
