import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { SubscriptionPlan } from '../entities/subscription.entity';

@Injectable()
export class MercadoPagoService {
  private client: MercadoPagoConfig;
  private preference: Preference;
  private payment: Payment;
  private readonly logger = new Logger(MercadoPagoService.name);

  // Precios de los planes
  private readonly PLAN_PRICES = {
    [SubscriptionPlan.RETAILER]: 5000, // $5000 ARS/mes
    [SubscriptionPlan.WHOLESALER]: 8000, // $8000 ARS/mes
  };

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>('MP_ACCESS_TOKEN');
    
    if (!accessToken) {
      throw new Error('MP_ACCESS_TOKEN no está configurado');
    }

    this.client = new MercadoPagoConfig({ 
      accessToken,
      options: { timeout: 5000 }
    });
    
    this.preference = new Preference(this.client);
    this.payment = new Payment(this.client);
  }

  /**
   * Obtener precio del plan
   */
  getPlanPrice(plan: SubscriptionPlan): number {
    return this.PLAN_PRICES[plan];
  }

  /**
   * Crear preferencia de pago para suscripción
   */
  async createSubscriptionPreference(
    subscriptionId: string,
    shopId: string,
    plan: SubscriptionPlan,
  ): Promise<{ id: string; initPoint: string }> {
    try {
      const amount = this.getPlanPrice(plan);
      const planName = plan === SubscriptionPlan.RETAILER ? 'Minorista' : 'Mayorista';

      const preferenceData = {
        items: [
          {
            id: subscriptionId,
            title: `Suscripción Plan ${planName}`,
            description: `Suscripción mensual para local ${planName.toLowerCase()}`,
            category_id: 'services',
            quantity: 1,
            unit_price: amount,
            currency_id: 'ARS',
          },
        ],
        payer: {
          email: 'test_user@test.com',
        },
        back_urls: {
          success: `${this.configService.get('FRONTEND_URL')}/subscription/success`,
          failure: `${this.configService.get('FRONTEND_URL')}/subscription/failure`,
          pending: `${this.configService.get('FRONTEND_URL')}/subscription/pending`,
        },
        auto_return: 'approved' as const,
        notification_url: `${this.configService.get('BACKEND_URL')}/api/webhooks/mercadopago`,
        external_reference: subscriptionId,
        metadata: {
          subscription_id: subscriptionId,
          shop_id: shopId,
          plan: plan,
        },
        statement_descriptor: 'PETSHOP SUBS',
      };

      const response = await this.preference.create({ body: preferenceData });

      // ✅ VALIDAR que la respuesta tenga los datos necesarios
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
    const webhookSecret = this.configService.get<string>('MP_WEBHOOK_SECRET');
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
}