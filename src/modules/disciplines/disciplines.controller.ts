import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { ApiListingResponse } from '@/common/decorators/api-listing-response.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { Listing } from '@/common/dto/listing.dto';
import { PaginationOptionsDto } from '@/common/dto/pagination-options.dto';
import { ValidatePaginationPipe } from '@/common/pipes/validate-pagination.pipe';
import { Auth } from '@/modules/auth/auth.decorator';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import { CreateDisciplineDto } from '@/modules/disciplines/dto/create-discipline.dto';
import {
  DISCIPLINE_SORT_FIELDS,
  DisciplineFilterDto,
} from '@/modules/disciplines/dto/discipline-filter.dto';
import { DisciplineResponseDto } from '@/modules/disciplines/dto/discipline-response.dto';
import { UpdateDisciplineDto } from '@/modules/disciplines/dto/update-discipline.dto';
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

  @Post()
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Criar disciplina' })
  @ApiResponse({ status: HttpStatus.CREATED, type: DisciplineResponseDto })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.CONFLICT,
  )
  create(
    @CurrentUser() professor: User,
    @Body() createDisciplineDto: CreateDisciplineDto,
  ): Promise<DisciplineResponseDto> {
    return this.disciplinesService.create({ professor, createDisciplineDto });
  }

  @Get(':id')
  @Auth()
  @ApiOperation({ summary: 'Consultar disciplina do professor responsável ou aluno matriculado' })
  @ApiResponse({ status: HttpStatus.OK, type: DisciplineResponseDto })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DisciplineResponseDto> {
    return this.disciplinesService.findOne({ user, id });
  }

  @Patch(':id')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Editar nome e descrição da disciplina' })
  @ApiResponse({ status: HttpStatus.OK, type: DisciplineResponseDto })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDisciplineDto: UpdateDisciplineDto,
  ): Promise<DisciplineResponseDto> {
    return this.disciplinesService.update({ professorId: user.id, id, updateDisciplineDto });
  }

  @Delete(':id')
  @Auth('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover disciplina sem matrículas nem atividades' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.disciplinesService.remove({ professorId: user.id, id });
  }
}
