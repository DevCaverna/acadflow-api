import { Controller, Get, HttpStatus, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Auth } from '@/modules/auth/auth.decorator';
import { StudentResponseDto } from '@/modules/enrollments/dto/student-response.dto';
import { EnrollmentsService } from '@/modules/enrollments/enrollments.service';
import { User } from '@/modules/users/entities/user.entity';

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
}
