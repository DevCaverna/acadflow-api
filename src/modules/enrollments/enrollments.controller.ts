import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Auth } from '@/modules/auth/auth.decorator';
import { StudentResponseDto } from '@/modules/enrollments/dto/student-response.dto';
import { StudentSearchDto } from '@/modules/enrollments/dto/student-search.dto';
import { EnrollmentsService } from '@/modules/enrollments/enrollments.service';
import { User } from '@/modules/users/entities/user.entity';

const ACCESS_ERRORS = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
];

@ApiTags('enrollments')
@Controller('disciplines/:id/students')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Listar alunos matriculados na disciplina' })
  @ApiResponse({ status: HttpStatus.OK, type: StudentResponseDto, isArray: true })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  findStudents(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
  ): Promise<StudentResponseDto[]> {
    return this.enrollmentsService.findStudents({ professorId: user.id, disciplineId });
  }

  @Get('candidates')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Buscar alunos ainda não matriculados (até 10)' })
  @ApiResponse({ status: HttpStatus.OK, type: StudentResponseDto, isArray: true })
  @ApiErrors(...ACCESS_ERRORS)
  findCandidates(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
    @Query() { search }: StudentSearchDto,
  ): Promise<StudentResponseDto[]> {
    return this.enrollmentsService.findCandidates({ professorId: user.id, disciplineId, search });
  }

  @Post(':studentId')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Matricular aluno na disciplina' })
  @ApiResponse({ status: HttpStatus.CREATED, type: StudentResponseDto })
  @ApiErrors(...ACCESS_ERRORS, HttpStatus.CONFLICT)
  enroll(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<StudentResponseDto> {
    return this.enrollmentsService.enroll({ professorId: user.id, disciplineId, studentId });
  }

  @Delete(':studentId')
  @Auth('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover matrícula de aluno sem notas na disciplina' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiErrors(...ACCESS_ERRORS, HttpStatus.CONFLICT)
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<void> {
    return this.enrollmentsService.remove({ professorId: user.id, disciplineId, studentId });
  }
}
