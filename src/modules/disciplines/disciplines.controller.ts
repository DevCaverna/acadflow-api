import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { ApiListingResponse } from '@/common/decorators/api-listing-response.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Listing } from '@/common/dto/listing.dto';
import { PaginationOptionsDto } from '@/common/dto/pagination-options.dto';
import { ValidatePaginationPipe } from '@/common/pipes/validate-pagination.pipe';
import { Auth } from '@/modules/auth/auth.decorator';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import {
  DISCIPLINE_SORT_FIELDS,
  DisciplineFilterDto,
} from '@/modules/disciplines/dto/discipline-filter.dto';
import { DisciplineResponseDto } from '@/modules/disciplines/dto/discipline-response.dto';
import { User } from '@/modules/users/entities/user.entity';

@ApiTags('disciplines')
@Controller('disciplines')
export class DisciplinesController {
  constructor(private readonly disciplinesService: DisciplinesService) {}

  @Get()
  @Auth()
  @ApiOperation({
    summary: 'Listar as disciplinas do professor ou aquelas em que o aluno está matriculado',
    description:
      'Filtros (JSON): search, semester. Ordenação: code, name ou semester; padrão name asc.',
  })
  @ApiListingResponse(DisciplineResponseDto)
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  findAll(
    @CurrentUser() user: User,
    @Query(new ValidatePaginationPipe(DisciplineFilterDto, DISCIPLINE_SORT_FIELDS))
    paginationOptionsDto: PaginationOptionsDto<DisciplineFilterDto>,
  ): Promise<Listing<DisciplineResponseDto>> {
    return this.disciplinesService.findAll({ user, paginationOptionsDto });
  }
}
