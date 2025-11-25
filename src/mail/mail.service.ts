import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { verifyEmailTemplate } from './templates/verify-email.template';
import { resetPasswordTemplate } from './templates/reset-password.template';

@Injectable()
export class MailService {
  private resend: Resend;
  private from: string;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(process.env.RESEND_API_KEY as string);

    // Siempre aseguramos un string
    this.from = this.configService.get<string>('mail.from') ?? 'no-reply@wallmapu.com';
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const response = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
      });

      if (response.error) {
        console.error('Resend error:', response.error);
        throw new InternalServerErrorException('Error al enviar correo');
      }

      return response;
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
