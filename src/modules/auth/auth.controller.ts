import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Auth } from '@/modules/auth/auth.decorator';
import { AuthService } from '@/modules/auth/auth.service';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SessionDto } from '@/modules/auth/dto/session.dto';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar com e-mail e senha' })
  @ApiResponse({ status: HttpStatus.OK, type: SessionDto })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
  login(@Body() loginDto: LoginDto): Promise<SessionDto> {
    return this.authService.login({ loginDto });
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Consultar o usuário autenticado' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiErrors(HttpStatus.UNAUTHORIZED)
  me(@CurrentUser() user: User): UserResponseDto {
    return UserResponseDto.from(user);
  }
}
