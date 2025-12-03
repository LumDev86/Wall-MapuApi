import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig;
  private preference: Preference;
  private payment: Payment;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get('MP_ACCESS_TOKEN');

    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN no está configurado');
    }

    this.client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 },
    });

    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  /**
   * Crear una preferencia de pago genérica
   */
  async createPreference(preferenceData: any) {
    try {
      const response = await this.preference.create({ body: preferenceData });

      if (!response.id || !response.init_point) {
        this.logger.error('Respuesta de MP sin ID o init_point:', response);
        throw new BadRequestException(
          'Error en la respuesta de Mercado Pago: datos incompletos',
        );
      }

      this.logger.log(`Preferencia creada: ${response.id}`);

      return {
        id: response.id,
        initPoint: response.init_point,
      };
    } catch (error) {
      this.logger.error('Error al crear preferencia de MP:', error);
      throw new BadRequestException(
        `Error al crear link de pago: ${error.message}`,
      );
    }
  }

  /**
   * Obtener información de un pago
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await this.payment.get({ id: paymentId });
      return payment;
    } catch (error) {
      this.logger.error(`Error al obtener pago ${paymentId}:`, error);
      throw new BadRequestException('Error al verificar el pago');
    }
  }

  /**
   * Verificar firma del webhook
   */
  verifyWebhookSignature(signature: string, secret: string): boolean {
    const webhookSecret = this.configService.get('MP_WEBHOOK_SECRET');
    return signature === webhookSecret;
  }

  /**
   * Procesar notificación de pago
   */
  async processPaymentNotification(paymentId: string) {
    try {
      const payment = await this.getPayment(paymentId);

      return {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: payment.external_reference,
        metadata: payment.metadata,
        transactionAmount: payment.transaction_amount,
        dateApproved: payment.date_approved,
        payerEmail: payment.payer?.email,
      };
    } catch (error) {
      this.logger.error('Error al procesar notificación:', error);
      throw error;
    }
  }

  /**
   * Procesar pago directo con tarjeta
   */
  async processCardPayment(paymentData: any) {
    try {
      this.logger.log('💳 Procesando pago con tarjeta...');

      const payment = await this.payment.create({
        body: paymentData,
      });

      this.logger.log(`Pago creado: ${payment.id} - Estado: ${payment.status}`);

      return {
        id: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail,
        externalReference: payment.external_reference,
        metadata: payment.metadata,
        transactionAmount: payment.transaction_amount,
        dateApproved: payment.date_approved,
        payerEmail: payment.payer?.email,
      };
    } catch (error) {
      this.logger.error('Error al procesar pago con tarjeta:', error);
      throw new BadRequestException(
        `Error al procesar el pago: ${error.message}`,
      );
    }
  }
}
