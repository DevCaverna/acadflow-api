import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Auth } from '@/modules/auth/auth.decorator';
import { GradeResponseDto } from '@/modules/grades/dto/grade-response.dto';
import { GradeSummaryDto, StudentGradesDto } from '@/modules/grades/dto/grade-summary.dto';
import { SaveGradeDto } from '@/modules/grades/dto/save-grade.dto';
import { GradesService } from '@/modules/grades/grades.service';
import { User } from '@/modules/users/entities/user.entity';

@ApiTags('grades')
@Controller()
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Put('activities/:id/grades/:studentId')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Lançar ou atualizar a nota de um aluno em uma atividade' })
  @ApiResponse({ status: HttpStatus.OK, type: GradeResponseDto })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  save(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) activityId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() saveGradeDto: SaveGradeDto,
  ): Promise<GradeResponseDto> {
    return this.gradesService.save({
      professorId: user.id,
      activityId,
      studentId,
      value: saveGradeDto.value,
    });
  }

  @Get('disciplines/:id/grades')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Consultar notas, média e situação dos alunos matriculados' })
  @ApiResponse({ status: HttpStatus.OK, type: StudentGradesDto, isArray: true })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  findAll(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
  ): Promise<StudentGradesDto[]> {
    return this.gradesService.findAll({ professorId: user.id, disciplineId });
  }

  @Get('disciplines/:id/grades/me')
  @Auth('ALUNO')
  @ApiOperation({ summary: 'Consultar as próprias notas, média e situação' })
  @ApiResponse({ status: HttpStatus.OK, type: GradeSummaryDto })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
  )
  findMine(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
  ): Promise<GradeSummaryDto> {
    return this.gradesService.findMine({ user, disciplineId });
  }
}
