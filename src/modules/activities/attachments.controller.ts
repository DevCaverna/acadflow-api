import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FILE_BODY, RequiredFilePipe } from '@/common/pipes/required-file.pipe';
import { AttachmentsService } from '@/modules/activities/attachments.service';
import {
  AttachmentResponseDto,
  AttachmentUrlDto,
} from '@/modules/activities/dto/attachment-response.dto';
import { Auth } from '@/modules/auth/auth.decorator';
import { User } from '@/modules/users/entities/user.entity';

const ACCESS_ERRORS = [
  HttpStatus.BAD_REQUEST,
  HttpStatus.UNAUTHORIZED,
  HttpStatus.FORBIDDEN,
  HttpStatus.NOT_FOUND,
];

@ApiTags('attachments')
@Controller()
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get('activities/:id/attachments')
  @Auth()
  @ApiOperation({ summary: 'Listar anexos da atividade' })
  @ApiResponse({ status: HttpStatus.OK, type: AttachmentResponseDto, isArray: true })
  @ApiErrors(...ACCESS_ERRORS)
  findAll(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) activityId: string,
  ): Promise<AttachmentResponseDto[]> {
    return this.attachmentsService.findAll({ user, activityId });
  }

  @Post('activities/:id/attachments')
  @Auth('PROFESSOR')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Anexar PDF, PNG ou JPG à atividade' })
  @ApiResponse({ status: HttpStatus.CREATED, type: AttachmentResponseDto })
  @ApiErrors(...ACCESS_ERRORS, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.SERVICE_UNAVAILABLE)
  create(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) activityId: string,
    @UploadedFile(RequiredFilePipe) file: Express.Multer.File,
  ): Promise<AttachmentResponseDto> {
    return this.attachmentsService.create({
      professorId: user.id,
      activityId,
      body: file.buffer,
      fileName: file.originalname,
    });
  }

  @Get('attachments/:id/url')
  @Auth()
  @ApiOperation({ summary: 'Gerar URL temporária de download' })
  @ApiResponse({ status: HttpStatus.OK, type: AttachmentUrlDto })
  @ApiErrors(...ACCESS_ERRORS, HttpStatus.SERVICE_UNAVAILABLE)
  getUrl(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AttachmentUrlDto> {
    return this.attachmentsService.getUrl({ user, id });
  }

  @Delete('attachments/:id')
  @Auth('PROFESSOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover anexo' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiErrors(...ACCESS_ERRORS)
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.attachmentsService.remove({ professorId: user.id, id });
  }
}
