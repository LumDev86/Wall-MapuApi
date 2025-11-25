import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
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
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, phone, role } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailVerificationToken = randomBytes(32).toString('hex');

    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      phone,
      role: role || UserRole.CLIENT,
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
