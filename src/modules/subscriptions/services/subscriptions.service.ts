import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { ShopStatus } from '../../shops/entities/shop.entity';

import { MercadoPagoService } from '../../../common/services/mercadopago.service';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  // Precios fijos
  private readonly PLAN_PRICES = {
    retailer: 18000,
    wholesaler: 20000,
  };

  constructor(
    @InjectRepository(Subscription)
    private subsRepo: Repository<Subscription>,

    @InjectRepository(Shop)
    private shopRepo: Repository<Shop>,

    private mpService: MercadoPagoService,
  ) {}

  // -------------------------------------------------------------
  // 🔵 CREATE SUBSCRIPTION — Genera la preferencia de pago
  // -------------------------------------------------------------
  async create(dto: CreateSubscriptionDto, user: User) {
    const amount = this.PLAN_PRICES[dto.plan];

    const subscriptionData: Partial<Subscription> = {
      plan: dto.plan,
      userId: user.id,
      amount,
      status: SubscriptionStatus.PENDING,
      autoRenew: dto.autoRenew ?? true,
    };

    // Creamos y guardamos la suscripción
    const subscription = this.subsRepo.create(subscriptionData);
    const savedSubscription = await this.subsRepo.save(subscription);

    // Generamos la preferencia de pago
    const preferenceResponse = await this.mpService.createPreference({
      id: savedSubscription.id,
      title: `Suscripción ${dto.plan}`,
      amount,
      user,
    });

    return {
      subscriptionId: savedSubscription.id,
      preferenceId: preferenceResponse.id,
      init_point: preferenceResponse.init_point,
    };
  }

  // -------------------------------------------------------------
  // 🔵 ACTIVAR SUSCRIPCIÓN (Webhook de Mercado Pago)
  // -------------------------------------------------------------
  async activate(subscriptionId: string, data: any) {
    const sub = await this.subsRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) return;

    sub.status = SubscriptionStatus.ACTIVE;
    sub.lastPaymentDate = new Date();

    const next = new Date();
    next.setDate(next.getDate() + 30);
    sub.nextPaymentDate = next;

    await this.subsRepo.save(sub);

    // Si el usuario tiene shops → activarlos
    const shops = await this.shopRepo.find({ where: { owner: { id: sub.userId } } });
    for (const shop of shops) {
      shop.status = ShopStatus.ACTIVE;
      await this.shopRepo.save(shop);
    }
  }

  // -------------------------------------------------------------
  // 🔵 OBTENER MI SUSCRIPCIÓN
  // -------------------------------------------------------------
  async findMySubscription(userId: string) {
    const subscription = await this.subsRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new NotFoundException('No tienes una suscripción activa o pendiente');
    }

    return subscription;
  }

  // -------------------------------------------------------------
  // 🔵 PROCESAR WEBHOOK DE MERCADO PAGO
  // -------------------------------------------------------------
  async processWebhook(paymentId: string) {
    try {
      const payment = await this.mpService.getPayment(paymentId);

      if (!payment || !payment.metadata) {
        return { message: 'Payment not found or missing metadata' };
      }

      const subscriptionId = payment.metadata.subscriptionId;
      if (!subscriptionId) {
        return { message: 'No subscriptionId found in metadata' };
      }

      if (payment.status === 'approved') {
        await this.activate(subscriptionId, payment);
        return { message: 'Subscription activated' };
      }

      return { message: `Payment status: ${payment.status}` };

    } catch (error) {
      console.error('Error processing webhook:', error);
      throw error;
    }
  }
}
