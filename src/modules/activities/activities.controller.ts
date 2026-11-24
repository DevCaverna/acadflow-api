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
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { ActivityResponseDto } from '@/modules/activities/dto/activity-response.dto';
import { CreateActivityDto } from '@/modules/activities/dto/create-activity.dto';
import { UpdateActivityDto } from '@/modules/activities/dto/update-activity.dto';
import { Auth } from '@/modules/auth/auth.decorator';
import { User } from '@/modules/users/entities/user.entity';

const ACCESS_ERRORS = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
];

@ApiTags('activities')
@Controller()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get('disciplines/:id/activities')
  @Auth()
  @ApiOperation({ summary: 'Listar atividades da disciplina, por prazo' })
  @ApiResponse({ status: HttpStatus.OK, type: ActivityResponseDto, isArray: true })
  @ApiErrors(...ACCESS_ERRORS)
  findAll(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
  ): Promise<ActivityResponseDto[]> {
    return this.activitiesService.findAll({ user, disciplineId });
  }

  @Post('disciplines/:id/activities')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Criar atividade, visível aos alunos matriculados' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ActivityResponseDto })
  @ApiErrors(...ACCESS_ERRORS)
  create(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) disciplineId: string,
    @Body() createActivityDto: CreateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.create({
      professorId: user.id,
      disciplineId,
      createActivityDto,
    });
  }

  @Patch('activities/:id')
  @Auth('PROFESSOR')
  @ApiOperation({ summary: 'Editar título, descrição e prazo da atividade' })
  @ApiResponse({ status: HttpStatus.OK, type: ActivityResponseDto })
  @ApiErrors(...ACCESS_ERRORS)
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.update({ professorId: user.id, id, updateActivityDto });
  }

  @Delete('activities/:id')
  @Auth('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover atividade sem notas' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiErrors(...ACCESS_ERRORS, HttpStatus.CONFLICT)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.activitiesService.remove({ professorId: user.id, id });
  }
}
