import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { User } from '../../modules/users/entities/user.entity';

interface PreferenceResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
}

@Injectable()
export class MercadoPagoService {
  private mp: MercadoPagoConfig;
  private isTestMode: boolean;

  constructor(private config: ConfigService) {
    const accessToken = this.config.get('MP_ACCESS_TOKEN')!;
    this.isTestMode = accessToken.startsWith('TEST-');

    this.mp = new MercadoPagoConfig({
      accessToken,
    });
  }

  async createPreference(data: {
    id: string;
    title: string;
    amount: number;
    user: User;
    shopId?: string;
    type?: 'subscription' | 'order';
    successUrl?: string;
    failureUrl?: string;
    notificationUrl?: string;
  }): Promise<PreferenceResponse> {
    const preference = new Preference(this.mp);

    const type = data.type || 'subscription';
    const successUrl = data.successUrl || `${this.config.get('FRONTEND_URL')}/subscription/success`;
    const failureUrl = data.failureUrl || `${this.config.get('FRONTEND_URL')}/subscription/failure`;
    const notificationUrl = data.notificationUrl || `${this.config.get('BACKEND_URL')}/api/webhooks/mercadopago`;

    const response = await preference.create({
      body: {
        items: [
          {
            id: data.id,
            title: data.title,
            quantity: 1,
            unit_price: data.amount,
          },
        ],
        back_urls: {
          success: successUrl,
          failure: failureUrl,
        },
        external_reference: data.id,
        metadata: {
          referenceId: data.id,
          userId: data.user.id,
          shopId: data.shopId,
          type: type,
        },
        notification_url: notificationUrl,
      },
    });

    // La respuesta de MercadoPago viene anidada
    // En modo test usamos sandbox_init_point, en producción usamos init_point
    return {
      id: response.id,
      init_point: this.isTestMode ? response.sandbox_init_point : response.init_point,
    };
  }

  async getPayment(id: string) {
    const payment = new Payment(this.mp);
    return payment.get({ id });
  }
}