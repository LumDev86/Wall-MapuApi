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

  constructor(private config: ConfigService) {
    this.mp = new MercadoPagoConfig({
      accessToken: this.config.get('MP_ACCESS_TOKEN')!,
    });
  }

  async createPreference(data: {
    id: string;
    title: string;
    amount: number;
    user: User;
    shopId?: string;
  }): Promise<PreferenceResponse> {
    const preference = new Preference(this.mp);

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
          success: `${this.config.get('FRONTEND_URL')}/subscription/success`,
          failure: `${this.config.get('FRONTEND_URL')}/subscription/failure`,
        },
        external_reference: data.id,
        metadata: {
          subscriptionId: data.id,
          userId: data.user.id,
          shopId: data.shopId,
          type: 'subscription',
        },
        notification_url: `${this.config.get('BACKEND_URL')}/webhooks/mercadopago`,
      },
    });

    // La respuesta de MercadoPago viene anidada
    return {
      id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
    };
  }

  async getPayment(id: string) {
    const payment = new Payment(this.mp);
    return payment.get({ id });
  }
}