import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Auth } from '@/modules/auth/auth.decorator';
import { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';
import { UpdateProfileDto } from '@/modules/users/dto/update-profile.dto';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('users')
@Controller('users/me')
@Auth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar o próprio perfil' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiErrors(HttpStatus.UNAUTHORIZED)
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.from(user);
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
}
