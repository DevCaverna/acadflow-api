import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiErrors } from '@/common/decorators/api-errors.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Auth } from '@/modules/auth/auth.decorator';
import { AuthService } from '@/modules/auth/auth.service';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { SessionDto } from '@/modules/auth/dto/session.dto';
import { AvatarsService } from '@/modules/users/avatars.service';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly avatarsService: AvatarsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autenticar com e-mail e senha' })
  @ApiResponse({ status: HttpStatus.OK, type: SessionDto })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED, HttpStatus.TOO_MANY_REQUESTS)
  login(@Body() loginDto: LoginDto, @Ip() ip: string): Promise<SessionDto> {
    return this.authService.login({ loginDto, ip });
  }

  @Post('register')
  @ApiOperation({ summary: 'Criar conta com perfil autodeclarado e iniciar sessão' })
  @ApiResponse({ status: HttpStatus.CREATED, type: SessionDto })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT, HttpStatus.TOO_MANY_REQUESTS)
  register(@Body() registerDto: RegisterDto, @Ip() ip: string): Promise<SessionDto> {
    return this.authService.register({ registerDto, ip });
  }

  @Get('me')
  @Auth()
  @ApiOperation({ summary: 'Consultar o usuário autenticado' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiErrors(HttpStatus.UNAUTHORIZED)
  me(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.avatarsService.toResponse({ user });
  }
}
