import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { verifyEmailTemplate } from './templates/verify-email.template';
import { resetPasswordTemplate } from './templates/reset-password.template';


@Injectable()
export class MailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('mail.host'),
      port: this.configService.get('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get('mail.user'),
        pass: this.configService.get('mail.pass'),
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('mail.from'),
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al enviar correo');
    }
  }

  async sendVerifyEmail(data: { to: string; name: string; verificationUrl: string }) {
    const html = verifyEmailTemplate({
      name: data.name,
      verificationUrl: data.verificationUrl,
    });

    await this.sendMail(data.to, 'Verificá tu correo', html);
  }

  async sendResetPasswordEmail(data: { to: string; resetUrl: string }) {
    const html = resetPasswordTemplate({
      resetUrl: data.resetUrl,
    });

    await this.sendMail(data.to, 'Restablecé tu contraseña', html);
  }

}
