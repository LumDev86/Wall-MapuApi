import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { Shop, ShopStatus } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';
import { MercadoPagoService } from '../../../common/services/mercadopago.service';
import { CreateSubscriptionDto } from '../dtos';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly MAX_PAYMENT_ATTEMPTS = 5;

  // Precios de planes en ARS
  private readonly PLAN_PRICES = {
    [SubscriptionPlan.RETAILER]: 5000,
    [SubscriptionPlan.WHOLESALER]: 8000,
  };

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    private mercadoPagoService: MercadoPagoService,
    private configService: ConfigService,
  ) {}

  /**
   * Crear una nueva suscripción con pago directo
   */
  async create(createSubscriptionDto: CreateSubscriptionDto, user: User) {
    const { plan, shopId, autoRenew = true, cardPayment } = createSubscriptionDto;

    // Verificar si ya tiene una suscripción activa o pendiente
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: [
        { userId: user.id, status: SubscriptionStatus.ACTIVE },
        { userId: user.id, status: SubscriptionStatus.PENDING },
      ],
    });

    if (existingSubscription) {
      throw new BadRequestException(
        `Ya tienes una suscripción ${existingSubscription.status === SubscriptionStatus.ACTIVE ? 'activa' : 'pendiente'}. Cancela la actual antes de crear una nueva.`,
      );
    }

    // Si se proporciona shopId, verificar que exista y pertenezca al usuario
    let shop: Shop | null = null;
    if (shopId) {
      shop = await this.shopRepository.findOne({
        where: { id: shopId },
        relations: ['owner'],
      });

      if (!shop) {
        throw new NotFoundException('Shop no encontrado');
      }

      if (shop.owner.id !== user.id) {
        throw new BadRequestException('El shop no te pertenece');
      }
    }

    const amount = this.PLAN_PRICES[plan];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30 días

    // Crear suscripción en BD con status PENDING
    const subscription = this.subscriptionRepository.create({
      plan,
      status: SubscriptionStatus.PENDING,
      startDate,
      endDate,
      amount,
      autoRenew,
      userId: user.id,
      shopId: shopId || undefined,
      failedPaymentAttempts: 0,
    });

    await this.subscriptionRepository.save(subscription);

    this.logger.log(
      `💳 Suscripción creada: ${subscription.id} - Procesando pago...`,
    );

    try {
      // Procesar pago con tarjeta directamente
      const paymentData = {
        transaction_amount: Number(amount),
        description: `Suscripción Plan ${plan === 'retailer' ? 'Minorista' : 'Mayorista'} - 30 días`,
        payment_method_id: 'master', // Mastercard
        payer: {
          email: user.email,
          identification: {
            type: 'DNI',
            number: cardPayment.cardholderIdentification,
          },
        },
        token: null, // No usamos token, usamos datos directos
        card: {
          card_number: cardPayment.cardNumber,
          security_code: cardPayment.securityCode,
          expiration_month: cardPayment.expirationMonth,
          expiration_year: cardPayment.expirationYear,
          cardholder: {
            name: cardPayment.cardholderName,
            identification: {
              type: 'DNI',
              number: cardPayment.cardholderIdentification,
            },
          },
        },
        external_reference: subscription.id,
        metadata: {
          subscription_id: subscription.id,
          user_id: user.id,
          shop_id: shopId,
          plan: plan,
          type: 'subscription',
        },
        notification_url: `${this.configService.get('BACKEND_URL')}/api/webhooks/mercadopago`,
      };

      const paymentResult = await this.mercadoPagoService.processCardPayment(paymentData);

      // Actualizar suscripción según resultado del pago
      subscription.mercadoPagoSubscriptionId = paymentResult.id ? String(paymentResult.id) : undefined;
      subscription.paymentDetails = paymentResult;

      if (paymentResult.status === 'approved') {
        // Pago aprobado - activar suscripción
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.lastPaymentDate = paymentResult.dateApproved
          ? new Date(paymentResult.dateApproved)
          : new Date();

        const nextPaymentDate = new Date();
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
        subscription.nextPaymentDate = nextPaymentDate;

        // Si tiene shop, activarlo
        if (shop) {
          shop.status = ShopStatus.ACTIVE;
          await this.shopRepository.save(shop);
          this.logger.log(`✅ Shop activado: ${shop.id}`);
        }

        await this.subscriptionRepository.save(subscription);

        this.logger.log(`✅ Suscripción activada: ${subscription.id}`);

        return {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          amount: subscription.amount,
          autoRenew: subscription.autoRenew,
          paymentStatus: paymentResult.status,
          message: '¡Pago aprobado! Tu suscripción está activa.',
        };

      } else if (paymentResult.status === 'rejected') {
        // Pago rechazado
        subscription.status = SubscriptionStatus.FAILED;
        subscription.failedPaymentAttempts = 1;
        await this.subscriptionRepository.save(subscription);

        this.logger.warn(`❌ Pago rechazado: ${subscription.id}`);

        throw new BadRequestException(
          `Pago rechazado: ${paymentResult.statusDetail}. Por favor verifica los datos de tu tarjeta.`,
        );

      } else {
        // Pago pendiente o en proceso
        subscription.status = SubscriptionStatus.PENDING;
        await this.subscriptionRepository.save(subscription);

        this.logger.log(`⏳ Pago pendiente: ${subscription.id} - Estado: ${paymentResult.status}`);

        return {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          amount: subscription.amount,
          autoRenew: subscription.autoRenew,
          paymentStatus: paymentResult.status,
          message: `Pago en proceso. Estado: ${paymentResult.status}`,
        };
      }

    } catch (error) {
      // Error al procesar pago
      subscription.status = SubscriptionStatus.FAILED;
      subscription.failedPaymentAttempts = 1;
      await this.subscriptionRepository.save(subscription);

      this.logger.error(`❌ Error al procesar pago: ${error.message}`);

      throw new BadRequestException(
        `Error al procesar el pago: ${error.message}`,
      );
    }
  }

  /**
   * Crear preferencia de pago en Mercado Pago
   */
  private async createPaymentPreference(subscription: Subscription, user: User) {
    const planName =
      subscription.plan === SubscriptionPlan.RETAILER
        ? 'Minorista'
        : 'Mayorista';

    const preferenceData = {
      items: [
        {
          id: subscription.id,
          title: `Suscripción Plan ${planName}`,
          description: `Suscripción mensual para local ${planName.toLowerCase()} - 30 días`,
          category_id: 'services',
          quantity: 1,
          unit_price: Number(subscription.amount),
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: user.name || 'Usuario',
        email: user.email,
      },
      back_urls: {
        success: `${this.configService.get('FRONTEND_URL')}/subscription/success`,
        failure: `${this.configService.get('FRONTEND_URL')}/subscription/failure`,
        pending: `${this.configService.get('FRONTEND_URL')}/subscription/pending`,
      },
      auto_return: 'approved' as const,
      notification_url: `${this.configService.get('BACKEND_URL')}/api/webhooks/mercadopago`,
      external_reference: subscription.id,
      metadata: {
        subscription_id: subscription.id,
        user_id: user.id,
        shop_id: subscription.shopId,
        plan: subscription.plan,
        type: 'subscription',
      },
      statement_descriptor: 'PETSHOP SUBS',
    };

    return await this.mercadoPagoService.createPreference(preferenceData);
  }

  /**
   * Obtener suscripción del usuario
   */
  async findMySubscription(userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId },
      relations: ['shop'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new NotFoundException('No tienes ninguna suscripción');
    }

    return subscription;
  }

  /**
   * Obtener estado de pago
   */
  async getPaymentStatus(subscriptionId: string, userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    const canRetryPayment =
      (subscription.status === SubscriptionStatus.PENDING ||
        subscription.status === SubscriptionStatus.FAILED) &&
      subscription.failedPaymentAttempts < this.MAX_PAYMENT_ATTEMPTS;

    const attemptsRemaining =
      this.MAX_PAYMENT_ATTEMPTS - subscription.failedPaymentAttempts;

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      canRetryPayment,
      attemptsRemaining: Math.max(0, attemptsRemaining),
    };
  }

  /**
   * Reintentar pago
   */
  async retryPayment(subscriptionId: string, user: User) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, userId: user.id },
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    if (
      subscription.status !== SubscriptionStatus.PENDING &&
      subscription.status !== SubscriptionStatus.FAILED
    ) {
      throw new BadRequestException(
        'Solo puedes reintentar el pago de suscripciones pendientes o fallidas',
      );
    }

    if (subscription.failedPaymentAttempts >= this.MAX_PAYMENT_ATTEMPTS) {
      throw new BadRequestException(
        'Has alcanzado el límite máximo de intentos de pago',
      );
    }

    // Incrementar intentos
    subscription.failedPaymentAttempts += 1;
    await this.subscriptionRepository.save(subscription);

    // Crear nueva preferencia de pago
    const preference = await this.createPaymentPreference(subscription, user);

    subscription.mercadoPagoPreapprovalId = preference.id;
    await this.subscriptionRepository.save(subscription);

    const attemptsRemaining =
      this.MAX_PAYMENT_ATTEMPTS - subscription.failedPaymentAttempts;

    return {
      message: 'Link de pago generado exitosamente',
      paymentLink: preference.initPoint,
      attemptsRemaining,
    };
  }

  /**
   * Procesar pago aprobado desde webhook
   */
  async processApprovedPayment(paymentData: any) {
    const subscriptionId = paymentData.externalReference;
    const metadata = paymentData.metadata || {};

    this.logger.log(`📥 Procesando pago aprobado para: ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop'],
    });

    if (!subscription) {
      this.logger.error(`❌ Suscripción no encontrada: ${subscriptionId}`);
      throw new NotFoundException('Suscripción no encontrada');
    }

    // Actualizar suscripción a ACTIVE
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.mercadoPagoSubscriptionId = paymentData.id;
    subscription.lastPaymentDate = new Date(paymentData.dateApproved);
    subscription.paymentDetails = paymentData;

    // Calcular próxima fecha de pago (30 días después)
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30);
    subscription.nextPaymentDate = nextPaymentDate;

    await this.subscriptionRepository.save(subscription);

    // Si tiene un shop vinculado, activarlo
    if (subscription.shop) {
      subscription.shop.status = ShopStatus.ACTIVE;
      await this.shopRepository.save(subscription.shop);
      this.logger.log(`✅ Shop activado: ${subscription.shop.id}`);
    }

    this.logger.log(`✅ Suscripción activada: ${subscription.id}`);

    return subscription;
  }

  /**
   * Procesar pago rechazado desde webhook
   */
  async processRejectedPayment(paymentData: any) {
    const subscriptionId = paymentData.externalReference;

    this.logger.warn(`⚠️ Pago rechazado para: ${subscriptionId}`);

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      this.logger.error(`❌ Suscripción no encontrada: ${subscriptionId}`);
      throw new NotFoundException('Suscripción no encontrada');
    }

    subscription.status = SubscriptionStatus.FAILED;
    subscription.mercadoPagoSubscriptionId = paymentData.id;
    subscription.paymentDetails = paymentData;

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`❌ Suscripción marcada como fallida: ${subscription.id}`);

    return subscription;
  }

  /**
   * Cancelar suscripción
   */
  async cancelSubscription(subscriptionId: string, userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
      relations: ['shop'],
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('La suscripción ya está cancelada');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;
    await this.subscriptionRepository.save(subscription);

    // Si tiene shop, suspenderlo
    if (subscription.shop) {
      subscription.shop.status = ShopStatus.SUSPENDED;
      await this.shopRepository.save(subscription.shop);
    }

    this.logger.log(`🚫 Suscripción cancelada: ${subscription.id}`);

    return {
      message: 'Suscripción cancelada exitosamente',
    };
  }

  /**
   * Toggle auto-renovación
   */
  async toggleAutoRenew(subscriptionId: string, userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    subscription.autoRenew = !subscription.autoRenew;
    await this.subscriptionRepository.save(subscription);

    return {
      message: `Renovación automática ${subscription.autoRenew ? 'activada' : 'desactivada'}`,
      autoRenew: subscription.autoRenew,
    };
  }
}
