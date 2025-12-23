import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateLocationDto } from './dtos/update-location.dto';
import { GoogleLoginDto } from './dtos/google-login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // -------------------------
  // REGISTRO
  // -------------------------
  @Post('register')
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Crea una nueva cuenta de usuario con email y contraseña. Retorna un token JWT para autenticación inmediata. El email debe ser único en el sistema.'
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente. Retorna el usuario creado y un token de acceso JWT.',
  })
  @ApiResponse({
    status: 409,
    description: 'El email ya está registrado en el sistema. Use otro email o recupere su contraseña.',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // -------------------------
  // LOGIN
  // -------------------------
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autentica al usuario con email y contraseña. Retorna un token JWT para usar en peticiones protegidas.'
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso. Retorna el usuario y un token de acceso JWT válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas. Email o contraseña incorrectos.',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }


  // -------------------------
  // GOOGLE LOGIN
  // -------------------------
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión con Google',
    description: 'Autentica al usuario usando Google Sign-In. Acepta el ID token de Google y retorna un JWT de la aplicación.'
  })
  @ApiResponse({
    status: 200,
    description: 'Login con Google exitoso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de Google inválido.',
  })
  async loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.loginWithGoogle(googleLoginDto);
  }

  // -------------------------
  // FORGOT PASSWORD
  // -------------------------
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
    description: 'Envía un email con un token para restablecer la contraseña. Por seguridad, siempre retorna 200 aunque el email no exista en el sistema.'
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada. Si el email existe, se enviará un correo con instrucciones.',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // -------------------------
  // RESET PASSWORD
  // -------------------------
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restablecer contraseña',
    description: 'Permite establecer una nueva contraseña usando el token recibido por email. El token tiene una validez limitada (generalmente 1 hora).'
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada exitosamente. Puede iniciar sesión con la nueva contraseña.',
  })
  @ApiResponse({
    status: 404,
    description: 'Token inválido o expirado. Solicite un nuevo token de recuperación.',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // -------------------------
  // ME (perfil actual)
  // -------------------------
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener usuario autenticado',
    description: 'Retorna los datos básicos del usuario actualmente autenticado según el token JWT. Para obtener el perfil completo con mascotas, use GET /users/profile.'
  })
  @ApiResponse({
    status: 200,
    description: 'Datos básicos del usuario autenticado.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticación inválido o expirado.',
  })
  async getProfile(@CurrentUser() user: User) {
    return { user };
  }

  // -------------------------
  // UPDATE LOCATION
  // -------------------------
  @Patch('location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar ubicación del usuario',
    description: 'Actualiza la dirección y coordenadas geográficas del usuario. Útil para búsquedas de tiendas cercanas basadas en la ubicación del usuario.'
  })
  @ApiResponse({
    status: 200,
    description: 'Ubicación actualizada exitosamente. Incluye dirección, ciudad, provincia, latitud y longitud.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token de autenticación inválido o expirado.',
  })
  async updateLocation(
    @CurrentUser() user: User,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.authService.updateLocation(user.id, updateLocationDto);
  }
}
