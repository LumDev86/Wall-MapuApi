import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
} from '../entities/subscription.entity';
import { Shop, ShopStatus } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { MercadoPagoService } from './mercadopago.service';
import { RedisService } from '../../../common/redis/redis.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    private mercadoPagoService: MercadoPagoService,
    private redisService: RedisService,
  ) {}

  /**
   * Crear una nueva suscripción
   */
  async create(createSubscriptionDto: CreateSubscriptionDto, user: User) {
    const { shopId, plan, autoRenew = true } = createSubscriptionDto;

    // Verificar que el shop existe y pertenece al usuario
    const shop = await this.shopRepository.findOne({
      where: { id: shopId },
      relations: ['owner', 'subscription'],
    });

    if (!shop) {
      throw new NotFoundException('Shop no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para crear una suscripción para este shop');
    }

    // Verificar que el plan coincide con el tipo de shop
    if (
      (plan === SubscriptionPlan.RETAILER && shop.type !== 'retailer') ||
      (plan === SubscriptionPlan.WHOLESALER && shop.type !== 'wholesaler')
    ) {
      throw new BadRequestException(
        `El plan ${plan} no coincide con el tipo de shop ${shop.type}`,
      );
    }

    // Verificar si ya tiene una suscripción activa
    if (shop.subscription && shop.subscription.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('El shop ya tiene una suscripción activa');
    }

    // Calcular fechas
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 30 días

    const amount = this.mercadoPagoService.getPlanPrice(plan);

    // Crear suscripción
    const subscription = this.subscriptionRepository.create({
      plan,
      status: SubscriptionStatus.PENDING,
      startDate,
      endDate,
      amount,
      autoRenew,
      shopId,
      nextPaymentDate: endDate,
    });

    await this.subscriptionRepository.save(subscription);

    // Crear preferencia de pago en Mercado Pago
    const { id: preferenceId, initPoint } =
      await this.mercadoPagoService.createSubscriptionPreference(
        subscription.id,
        shopId,
        plan,
      );

    subscription.mercadoPagoPreapprovalId = preferenceId;
    await this.subscriptionRepository.save(subscription);

    // Invalidar cache
    await this.redisService.del(`shop:${shopId}`);
    await this.redisService.deleteKeysByPattern('shops:location:*');

    return {
      message: 'Suscripción creada exitosamente. Procede al pago.',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        amount: subscription.amount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        initPoint, // URL de pago
      },
    };
  }

  /**
   * Procesar pago aprobado
   */
  async processApprovedPayment(paymentData: any) {
    const { external_reference: subscriptionId, id: paymentId } = paymentData;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop'],
    });

    if (!subscription) {
      this.logger.error(`Suscripción no encontrada: ${subscriptionId}`);
      return;
    }

    // Actualizar suscripción
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.lastPaymentDate = new Date();
    subscription.mercadoPagoSubscriptionId = paymentId;
    subscription.paymentDetails = paymentData;

    await this.subscriptionRepository.save(subscription);

    // Actualizar estado del shop
    subscription.shop.status = ShopStatus.ACTIVE;
    await this.shopRepository.save(subscription.shop);

    // Invalidar cache
    await this.redisService.del(`shop:${subscription.shopId}`);
    await this.redisService.deleteKeysByPattern('shops:location:*');

    this.logger.log(`Suscripción activada: ${subscriptionId}`);

    return subscription;
  }

  /**
   * Obtener suscripción de un shop
   */
  async findByShop(shopId: string, user: User) {
    const shop = await this.shopRepository.findOne({
      where: { id: shopId },
      relations: ['owner', 'subscription'],
    });

    if (!shop) {
      throw new NotFoundException('Shop no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para ver esta suscripción');
    }

    if (!shop.subscription) {
      throw new NotFoundException('El shop no tiene suscripción');
    }

    return {
      subscription: shop.subscription,
      daysUntilExpiration: this.getDaysUntilExpiration(shop.subscription.endDate),
    };
  }

  /**
   * Cancelar suscripción
   */
  async cancel(shopId: string, user: User) {
    const shop = await this.shopRepository.findOne({
      where: { id: shopId },
      relations: ['owner', 'subscription'],
    });

    if (!shop) {
      throw new NotFoundException('Shop no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para cancelar esta suscripción');
    }

    if (!shop.subscription) {
      throw new NotFoundException('El shop no tiene suscripción');
    }

    shop.subscription.status = SubscriptionStatus.CANCELLED;
    shop.subscription.autoRenew = false;
    await this.subscriptionRepository.save(shop.subscription);

    // Invalidar cache
    await this.redisService.del(`shop:${shopId}`);
    await this.redisService.deleteKeysByPattern('shops:location:*');

    return {
      message: 'Suscripción cancelada. El shop permanecerá activo hasta la fecha de vencimiento.',
      subscription: shop.subscription,
    };
  }

  /**
   * Cron job: Verificar suscripciones vencidas (se ejecuta diariamente a las 00:00)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions() {
    this.logger.log('Verificando suscripciones vencidas...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(today),
      },
      relations: ['shop'],
    });

    for (const subscription of expiredSubscriptions) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepository.save(subscription);

      // Ocultar shop del mapa
      subscription.shop.status = ShopStatus.SUSPENDED;
      await this.shopRepository.save(subscription.shop);

      // Invalidar cache
      await this.redisService.del(`shop:${subscription.shopId}`);

      this.logger.log(`Suscripción expirada: ${subscription.id} - Shop: ${subscription.shop.name}`);
    }

    // Invalidar cache global
    await this.redisService.deleteKeysByPattern('shops:location:*');

    this.logger.log(`${expiredSubscriptions.length} suscripciones expiradas procesadas`);
  }

  /**
   * Cron job: Notificar suscripciones próximas a vencer (3 días antes)
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async notifyUpcomingExpirations() {
    this.logger.log('Verificando suscripciones próximas a vencer...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingExpirations = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.shop', 'shop')
      .leftJoinAndSelect('shop.owner', 'owner')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.endDate >= :today', { today })
      .andWhere('subscription.endDate <= :threeDays', { threeDays: threeDaysFromNow })
      .getMany();

    for (const subscription of upcomingExpirations) {
      const daysLeft = this.getDaysUntilExpiration(subscription.endDate);
      
      this.logger.log(
        `Notificar a ${subscription.shop.owner.email}: Suscripción vence en ${daysLeft} días`,
      );

      // TODO: Aquí implementarías el envío de email
      // await this.emailService.sendExpirationWarning(subscription);
    }

    this.logger.log(`${upcomingExpirations.length} notificaciones enviadas`);
  }

  /**
   * Calcular días hasta expiración
   */
  private getDaysUntilExpiration(endDate: Date): number {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Obtener estadísticas de suscripciones (para admin)
   */
  async getStats() {
    const [active, expired, pending, cancelled] = await Promise.all([
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.PENDING } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.CANCELLED } }),
    ]);

    return {
      total: active + expired + pending + cancelled,
      active,
      expired,
      pending,
      cancelled,
    };
  }
}