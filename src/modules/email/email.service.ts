import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn('⚠️  RESEND_API_KEY no está configurada. Los emails no se enviarán.');
      return;
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM', 'Wall-Mapu <noreply@wallmapu.app>');

    this.logger.log('✅ Email service initialized with Resend');
  }

  /**
   * Enviar email usando Resend API
   */
  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      this.logger.log(`📧 Sending email to ${options.to}: ${options.subject}`);

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        this.logger.error(`❌ Error sending email: ${error.message}`);
        return false;
      }

      this.logger.log(`✅ Email sent successfully. ID: ${data.id}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Exception sending email: ${error.message}`);
      return false;
    }
  }

  /**
   * Email de bienvenida para nuevo usuario
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🐾 ¡Bienvenido a Wall-Mapu!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            <p>¡Gracias por registrarte en Wall-Mapu! Estamos emocionados de tenerte con nosotros.</p>
            <p>Con Wall-Mapu puedes:</p>
            <ul>
              <li>🗺️ Encontrar tiendas de mascotas cerca de ti</li>
              <li>🛒 Descubrir productos para tu mascota</li>
              <li>💼 Si tienes una tienda, promocionarla en nuestra plataforma</li>
            </ul>
            <p>¡Comienza a explorar ahora!</p>
            <a href="https://wallmapu.app" class="button">Explorar Wall-Mapu</a>
          </div>
          <div class="footer">
            <p>Wall-Mapu - Tu plataforma de confianza para mascotas 🐾</p>
            <p>Si tienes alguna pregunta, contáctanos en soporte@wallmapu.app</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🐾 ¡Bienvenido a Wall-Mapu!',
      html,
    });
  }

  /**
   * Email de recuperación de contraseña
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `https://wallmapu.app/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Recuperación de Contraseña</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña de Wall-Mapu.</p>
            <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este enlace expirará en 1 hora</li>
                <li>Si no solicitaste este cambio, ignora este email</li>
                <li>Nunca compartas este enlace con nadie</li>
              </ul>
            </div>
            <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>Wall-Mapu - Tu plataforma de confianza para mascotas 🐾</p>
            <p>Si tienes problemas, contáctanos en soporte@wallmapu.app</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '🔐 Recuperación de Contraseña - Wall-Mapu',
      html,
    });
  }

  /**
   * Email de confirmación de pago de suscripción
   */
  async sendSubscriptionPaymentEmail(
    email: string,
    name: string,
    plan: string,
    amount: number,
  ): Promise<boolean> {
    const planName = plan === 'retailer' ? 'Minorista' : 'Mayorista';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ¡Pago Confirmado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            <div class="success-box">
              <strong>✅ Tu pago ha sido procesado exitosamente</strong>
            </div>
            <p>Gracias por suscribirte al plan <strong>${planName}</strong> de Wall-Mapu.</p>

            <div class="details">
              <h3>📋 Detalles de la Suscripción</h3>
              <div class="details-row">
                <span><strong>Plan:</strong></span>
                <span>${planName}</span>
              </div>
              <div class="details-row">
                <span><strong>Monto:</strong></span>
                <span>$${amount.toLocaleString('es-AR')} ARS</span>
              </div>
              <div class="details-row">
                <span><strong>Estado:</strong></span>
                <span style="color: #10b981;">Activo</span>
              </div>
            </div>

            <p>Tu tienda ahora está visible en el mapa de Wall-Mapu y los usuarios podrán encontrarte fácilmente.</p>

            <a href="https://wallmapu.app/mi-tienda" class="button">Ver Mi Tienda</a>
          </div>
          <div class="footer">
            <p>Wall-Mapu - Tu plataforma de confianza para mascotas 🐾</p>
            <p>¿Necesitas ayuda? Contáctanos en soporte@wallmapu.app</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: '✅ Pago de Suscripción Confirmado - Wall-Mapu',
      html,
    });
  }

  /**
   * Email de confirmación de compra
   */
  async sendOrderConfirmationEmail(
    email: string,
    name: string,
    orderId: string,
    totalAmount: number,
    itemsCount: number,
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .details-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 20px; font-weight: bold; color: #667eea; padding-top: 15px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 ¡Pedido Confirmado!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${name}</strong>,</p>
            <div class="success-box">
              <strong>✅ Tu pedido ha sido confirmado y está en proceso</strong>
            </div>
            <p>Gracias por tu compra en Wall-Mapu. Hemos recibido tu orden y la estamos procesando.</p>

            <div class="details">
              <h3>📋 Detalles del Pedido</h3>
              <div class="details-row">
                <span><strong>Número de Orden:</strong></span>
                <span>#${orderId.substring(0, 8).toUpperCase()}</span>
              </div>
              <div class="details-row">
                <span><strong>Productos:</strong></span>
                <span>${itemsCount} ${itemsCount === 1 ? 'artículo' : 'artículos'}</span>
              </div>
              <div class="details-row" style="border-bottom: none;">
                <span class="total">Total:</span>
                <span class="total">$${totalAmount.toLocaleString('es-AR')} ARS</span>
              </div>
            </div>

            <p>El vendedor se pondrá en contacto contigo pronto para coordinar la entrega.</p>

            <a href="https://wallmapu.app/mis-pedidos" class="button">Ver Mis Pedidos</a>
          </div>
          <div class="footer">
            <p>Wall-Mapu - Tu plataforma de confianza para mascotas 🐾</p>
            <p>¿Tienes preguntas? Contáctanos en soporte@wallmapu.app</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `🛒 Pedido Confirmado #${orderId.substring(0, 8).toUpperCase()} - Wall-Mapu`,
      html,
    });
  }
}
