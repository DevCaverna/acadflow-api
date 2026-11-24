import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { FILE_BODY, RequiredFilePipe } from '@/common/pipes/required-file.pipe';
import { Auth } from '@/modules/auth/auth.decorator';
import { AvatarsService } from '@/modules/users/avatars.service';
import { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';
import { UpdateProfileDto } from '@/modules/users/dto/update-profile.dto';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('users')
@Controller('users/me')
@Auth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarsService: AvatarsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Consultar o próprio perfil' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiErrors(HttpStatus.UNAUTHORIZED)
  me(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.avatarsService.toResponse({ user });
  }

  @Patch()
  @ApiOperation({ summary: 'Editar o próprio nome e e-mail' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.CONFLICT)
  updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile({ user, updateProfileDto });
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Trocar a própria senha' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword({ userId: user.id, changePasswordDto });
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @ApiOperation({ summary: 'Enviar foto de perfil em PNG, JPG ou WebP' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.UNAUTHORIZED,
    HttpStatus.PAYLOAD_TOO_LARGE,
    HttpStatus.SERVICE_UNAVAILABLE,
  )
  updateAvatar(
    @CurrentUser() user: User,
    @UploadedFile(RequiredFilePipe) file: Express.Multer.File,
  ): Promise<UserResponseDto> {
    return this.avatarsService.update({ user, body: file.buffer });
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover a foto de perfil' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiErrors(HttpStatus.UNAUTHORIZED)
  removeAvatar(@CurrentUser() user: User): Promise<void> {
    return this.avatarsService.remove({ user });
  }
}
