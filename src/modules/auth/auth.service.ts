import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { UpdateLocationDto } from './dtos/update-location.dto';
import { GoogleLoginDto } from './dtos/google-login.dto';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { GeocodingService } from '../../common/services/geocoding.service';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly geocodingService: GeocodingService,
  ) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
    );
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name, phone, role, province, city, address } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailVerificationToken = randomBytes(32).toString('hex');

    // Geocodificación automática si se proporciona dirección
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (address) {
      try {
        const geoResult = await this.geocodingService.geocodeAddress(
          address,
          city,
          province,
        );
        latitude = geoResult.latitude;
        longitude = geoResult.longitude;
      } catch (error) {
        // Si falla la geocodificación, continuar sin coordenadas
        console.warn(`Geocodificación falló para usuario ${email}:`, error.message);
      }
    }

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
      role: role || UserRole.CLIENT,
      province,
      city,
      address,
      latitude,
      longitude,
      emailVerificationToken,
    });

    await this.userRepository.save(user);

    /** -------------------------------------------
     ** Envío de correo deshabilitado temporalmente
     --------------------------------------------- */
    /*
    await this.mailService.sendVerifyEmail({
      to: email,
      name: name || 'Usuario',
      verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`,
    });
    */

    const token = this.generateToken(user);

    return {
      message: 'Usuario registrado exitosamente.',
      user: this.sanitizeUser(user),
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    const token = this.generateToken(user);

    return {
      message: 'Login exitoso',
      user: this.sanitizeUser(user),
      token,
    };
  }

  async loginWithGoogle(googleLoginDto: GoogleLoginDto) {
    const { idToken } = googleLoginDto;

    try {
      // Verificar el token con Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Token de Google inválido');
      }

      const { email, name } = payload;

      // Buscar si el usuario ya existe
      let user = await this.userRepository.findOne({
        where: { email },
      });

      if (user) {
        // Usuario existente - verificar que esté activo
        if (!user.isActive) {
          throw new UnauthorizedException('Usuario inactivo');
        }
      } else {
        // Crear nuevo usuario
        // Para usuarios de Google, generamos una contraseña aleatoria que nunca usarán
        const randomPassword = randomBytes(32).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        user = this.userRepository.create({
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
          role: UserRole.CLIENT,
          isEmailVerified: true, // Google ya verificó el email
        });

        await this.userRepository.save(user);
      }

      const token = this.generateToken(user);

      return {
        message: 'Login con Google exitoso',
        user: this.sanitizeUser(user),
        token,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Error en Google login:', error);
      throw new UnauthorizedException('Error al validar token de Google');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      return {
        message: 'Si el email existe, recibirás un correo con instrucciones',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;

    await this.userRepository.save(user);

    /** -------------------------------------------
     ** Envío de correo deshabilitado temporalmente
     --------------------------------------------- */
    /*
    await this.mailService.sendResetPasswordEmail({
      to: email,
      resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
    });
    */

    return {
      message: 'Si el email existe, recibirás un correo con instrucciones',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new NotFoundException('Token inválido o expirado');
    }

    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new UnauthorizedException('Token expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await this.userRepository.save(user);

    return {
      message: 'Contraseña actualizada exitosamente',
    };
  }

  async updateLocation(userId: string, updateLocationDto: UpdateLocationDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { province, city, address, latitude, longitude } = updateLocationDto;

    // Actualizar campos de dirección si se proporcionan
    if (province !== undefined) user.province = province;
    if (city !== undefined) user.city = city;
    if (address !== undefined) user.address = address;

    // Coordenadas REQUERIDAS desde el frontend
    // Ya no se hace geocoding en el backend
    user.latitude = latitude;
    user.longitude = longitude;

    await this.userRepository.save(user);

    return {
      message: 'Ubicación actualizada exitosamente',
      user: this.sanitizeUser(user),
    };
  }

  async validateUser(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    return this.sanitizeUser(user);
  }

  private generateToken(user: User): string {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { password, passwordResetToken, emailVerificationToken, ...sanitized } = user;
    return sanitized;
  }
}
