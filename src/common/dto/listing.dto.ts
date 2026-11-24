import { ApiProperty } from '@nestjs/swagger';

export class Listing<Item> {
  @ApiProperty({ description: 'Página atual', example: 1 })
  readonly page!: number;

  @ApiProperty({ description: 'Itens por página', example: 20 })
  readonly perPage!: number;

  @ApiProperty({ description: 'Total de itens', example: 42 })
  readonly total!: number;

  readonly data!: Item[];
}
