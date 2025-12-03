import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
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
   * Crear una nueva suscripción o reintentar una existente
   */
  async create(createSubscriptionDto: CreateSubscriptionDto, user: User) {
    const { plan, autoRenew = true } = createSubscriptionDto;

    // Verificar que el usuario no tenga ya una suscripción activa
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('Ya tienes una suscripción activa');
    }

    // Verificar si tiene suscripciones PENDING o FAILED para reintentar
    const pendingSubscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        status: In([SubscriptionStatus.PENDING, SubscriptionStatus.FAILED]),
      },
    });

    if (pendingSubscription) {
      this.logger.log(
        `Reintentando pago para suscripción existente: ${pendingSubscription.id}`,
      );
      return this.retryPayment(pendingSubscription.id, user);
    }

    // Calcular fechas
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 30 días

    const amount = this.mercadoPagoService.getPlanPrice(plan);

    // Crear suscripción (sin shopId por ahora)
    const subscription = this.subscriptionRepository.create({
      plan,
      status: SubscriptionStatus.PENDING,
      startDate,
      endDate,
      amount,
      autoRenew,
      userId: user.id,
      nextPaymentDate: endDate,
      failedPaymentAttempts: 0,
    });

    await this.subscriptionRepository.save(subscription);

    try {
      // Crear preferencia de pago en Mercado Pago
      const { id: preferenceId, initPoint } =
        await this.mercadoPagoService.createSubscriptionPreference(
          subscription.id,
          user.id, // Usar userId como referencia
          plan,
        );

      subscription.mercadoPagoPreapprovalId = preferenceId;
      await this.subscriptionRepository.save(subscription);

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
    } catch (error) {
      // Si falla la creación de la preferencia, marcar como fallida
      subscription.status = SubscriptionStatus.FAILED;
      subscription.failedPaymentAttempts += 1;
      await this.subscriptionRepository.save(subscription);

      throw new BadRequestException(
        `Error al generar link de pago: ${error.message}. Puedes reintentar más tarde.`,
      );
    }
  }

  /**
   * 🆕 Reintentar pago de una suscripción pendiente o fallida
   */
  async retryPayment(subscriptionId: string, user: User) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop'],
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    if (subscription.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para reintentar este pago');
    }

    if (
      subscription.status !== SubscriptionStatus.PENDING &&
      subscription.status !== SubscriptionStatus.FAILED
    ) {
      throw new BadRequestException(
        'Solo se pueden reintentar pagos de suscripciones PENDING o FAILED',
      );
    }

    // Límite de intentos fallidos
    if (subscription.failedPaymentAttempts >= 5) {
      throw new BadRequestException(
        'Has excedido el límite de intentos de pago. Contacta a soporte.',
      );
    }

    try {
      // Crear una nueva preferencia de pago en Mercado Pago
      const { id: preferenceId, initPoint } =
        await this.mercadoPagoService.createSubscriptionPreference(
          subscription.id,
          user.id,
          subscription.plan,
        );

      // Actualizar suscripción con nueva preferencia
      subscription.mercadoPagoPreapprovalId = preferenceId;
      subscription.status = SubscriptionStatus.PENDING;
      await this.subscriptionRepository.save(subscription);

      this.logger.log(`Nuevo intento de pago generado para: ${subscriptionId}`);

      return {
        message: 'Nueva preferencia de pago generada. Procede al pago.',
        subscription: {
          id: subscription.id,
          plan: subscription.plan,
          status: subscription.status,
          amount: subscription.amount,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          initPoint, // Nueva URL de pago
          attemptsRemaining: 5 - subscription.failedPaymentAttempts,
        },
      };
    } catch (error) {
      // Incrementar contador de intentos fallidos
      subscription.failedPaymentAttempts += 1;
      await this.subscriptionRepository.save(subscription);

      throw new BadRequestException(
        `Error al generar link de pago: ${error.message}. Intentos restantes: ${5 - subscription.failedPaymentAttempts}`,
      );
    }
  }

  /**
   * Procesar pago aprobado
   */
  async processApprovedPayment(paymentData: any) {
    const { external_reference: subscriptionId, id: paymentId } = paymentData;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop', 'user'],
    });

    if (!subscription) {
      this.logger.error(`Suscripción no encontrada: ${subscriptionId}`);
      return;
    }

    const isRenewal = subscription.status === SubscriptionStatus.ACTIVE;

    if (isRenewal) {
      // 🔄 Renovación: Extender la suscripción un mes más
      this.logger.log(`🔄 Procesando renovación de suscripción: ${subscriptionId}`);

      const newEndDate = new Date(subscription.endDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1);

      subscription.endDate = newEndDate;
      subscription.lastPaymentDate = new Date();
      subscription.nextPaymentDate = newEndDate;
      subscription.mercadoPagoSubscriptionId = paymentId;
      subscription.paymentDetails = {
        ...paymentData,
        renewedAt: new Date(),
      };
      subscription.failedPaymentAttempts = 0;

      await this.subscriptionRepository.save(subscription);

      this.logger.log(
        `✅ Suscripción renovada hasta: ${newEndDate.toLocaleDateString()} - ${subscriptionId}`,
      );
    } else {
      // 🆕 Activación inicial
      this.logger.log(`🆕 Activando suscripción nueva: ${subscriptionId}`);

      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.lastPaymentDate = new Date();
      subscription.mercadoPagoSubscriptionId = paymentId;
      subscription.paymentDetails = paymentData;
      subscription.failedPaymentAttempts = 0;

      await this.subscriptionRepository.save(subscription);

      // 🆕 Actualizar rol del usuario según el plan
      const userRole = subscription.plan === SubscriptionPlan.RETAILER
        ? 'retailer'
        : 'wholesaler';

      subscription.user.role = userRole as any;
      await this.subscriptionRepository.manager.save(subscription.user);

      // Actualizar estado del shop (solo si existe)
      if (subscription.shop) {
        subscription.shop.status = ShopStatus.ACTIVE;
        await this.shopRepository.save(subscription.shop);
        this.logger.log(`✅ Shop activado: ${subscription.shop.name}`);
      }

      this.logger.log(`✅ Suscripción activada y rol actualizado: ${subscriptionId}`);
    }

    // Invalidar cache (solo si existe shop)
    if (subscription.shopId) {
      await this.redisService.del(`shop:${subscription.shopId}`);
      await this.redisService.deleteKeysByPattern('shops:location:*');
    }

    return subscription;
  }

  /**
   * 🆕 Procesar pago fallido
   */
  async processFailedPayment(paymentData: any) {
    const { external_reference: subscriptionId } = paymentData;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop'],
    });

    if (!subscription) {
      this.logger.error(`Suscripción no encontrada: ${subscriptionId}`);
      return;
    }

    // Marcar como fallida
    subscription.status = SubscriptionStatus.FAILED;
    subscription.failedPaymentAttempts += 1;
    subscription.paymentDetails = {
      ...paymentData,
      failedAt: new Date(),
    };

    await this.subscriptionRepository.save(subscription);

    this.logger.log(
      `❌ Pago fallido para suscripción: ${subscriptionId} (Intento ${subscription.failedPaymentAttempts}/5)`,
    );

    return subscription;
  }

  /**
   * 🆕 Procesar pago rechazado
   */
  async processRejectedPayment(paymentData: any) {
    const { external_reference: subscriptionId } = paymentData;

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop'],
    });

    if (!subscription) {
      this.logger.error(`Suscripción no encontrada: ${subscriptionId}`);
      return;
    }

    subscription.status = SubscriptionStatus.FAILED;
    subscription.failedPaymentAttempts += 1;
    subscription.paymentDetails = {
      ...paymentData,
      rejectedAt: new Date(),
    };

    await this.subscriptionRepository.save(subscription);

    this.logger.log(`⚠️ Pago rechazado para suscripción: ${subscriptionId}`);

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

    const canRetryPayment =
      shop.subscription.status === SubscriptionStatus.PENDING ||
      shop.subscription.status === SubscriptionStatus.FAILED;

    return {
      subscription: shop.subscription,
      daysUntilExpiration: this.getDaysUntilExpiration(shop.subscription.endDate),
      canRetryPayment,
      attemptsRemaining: canRetryPayment
        ? 5 - shop.subscription.failedPaymentAttempts
        : null,
    };
  }

  /**
   * 🆕 Obtener mi suscripción (usuario autenticado)
   */
  async findMySubscription(user: User) {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        status: In([
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PENDING,
          SubscriptionStatus.FAILED,
        ]),
      },
      relations: ['shop'],
      order: {
        createdAt: 'DESC',
      },
    });

    if (!subscription) {
      return {
        subscription: null,
        message: 'No tienes ninguna suscripción',
      };
    }

    const canRetryPayment =
      subscription.status === SubscriptionStatus.PENDING ||
      subscription.status === SubscriptionStatus.FAILED;

    return {
      subscription,
      daysUntilExpiration: subscription.status === SubscriptionStatus.ACTIVE
        ? this.getDaysUntilExpiration(subscription.endDate)
        : null,
      canRetryPayment,
      attemptsRemaining: canRetryPayment
        ? 5 - subscription.failedPaymentAttempts
        : null,
    };
  }

  /**
   * 🆕 Obtener estado de pago de una suscripción
   */
  async getPaymentStatus(subscriptionId: string, user: User) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['shop'],
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    if (subscription.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para ver esta suscripción');
    }

    const canRetryPayment =
      subscription.status === SubscriptionStatus.PENDING ||
      subscription.status === SubscriptionStatus.FAILED;

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      plan: subscription.plan,
      amount: subscription.amount,
      canRetryPayment,
      failedAttempts: subscription.failedPaymentAttempts,
      attemptsRemaining: canRetryPayment ? 5 - subscription.failedPaymentAttempts : 0,
      paymentDetails: subscription.paymentDetails,
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
   * 🆕 Activar/Desactivar renovación automática
   */
  async toggleAutoRenew(shopId: string, autoRenew: boolean, user: User) {
    const shop = await this.shopRepository.findOne({
      where: { id: shopId },
      relations: ['owner', 'subscription'],
    });

    if (!shop) {
      throw new NotFoundException('Shop no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta suscripción',
      );
    }

    if (!shop.subscription) {
      throw new NotFoundException('El shop no tiene suscripción');
    }

    if (shop.subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Solo puedes modificar la renovación automática en suscripciones activas',
      );
    }

    shop.subscription.autoRenew = autoRenew;
    await this.subscriptionRepository.save(shop.subscription);

    // Invalidar cache
    await this.redisService.del(`shop:${shopId}`);

    const message = autoRenew
      ? 'Renovación automática activada. Tu suscripción se renovará automáticamente cada mes.'
      : 'Renovación automática desactivada. Tu suscripción no se renovará automáticamente.';

    this.logger.log(
      `${autoRenew ? '✅ Activada' : '❌ Desactivada'} renovación automática para suscripción: ${shop.subscription.id}`,
    );

    return {
      message,
      subscription: shop.subscription,
    };
  }

  /**
   * Cron job: Verificar suscripciones vencidas (se ejecuta diariamente a las 00:00)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions() {
    this.logger.log('🔍 Verificando suscripciones vencidas...');

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

      this.logger.log(`⏰ Suscripción expirada: ${subscription.id} - Shop: ${subscription.shop.name}`);
    }

    // Invalidar cache global
    await this.redisService.deleteKeysByPattern('shops:location:*');

    this.logger.log(`✅ ${expiredSubscriptions.length} suscripciones expiradas procesadas`);
  }

  /**
   * 🆕 Cron job: Limpiar suscripciones PENDING/FAILED antiguas (7 días)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupStaleSubscriptions() {
    this.logger.log('🧹 Limpiando suscripciones pendientes antiguas...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const staleSubscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.status IN (:...statuses)', {
        statuses: [SubscriptionStatus.PENDING, SubscriptionStatus.FAILED],
      })
      .andWhere('subscription.createdAt < :sevenDaysAgo', { sevenDaysAgo })
      .getMany();

    for (const subscription of staleSubscriptions) {
      subscription.status = SubscriptionStatus.CANCELLED;
      await this.subscriptionRepository.save(subscription);

      this.logger.log(
        `🗑️ Suscripción pendiente cancelada por inactividad: ${subscription.id}`,
      );
    }

    this.logger.log(`✅ ${staleSubscriptions.length} suscripciones pendientes canceladas`);
  }

  /**
   * Cron job: Notificar suscripciones próximas a vencer (3 días antes)
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async notifyUpcomingExpirations() {
    this.logger.log('📧 Verificando suscripciones próximas a vencer...');

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
        `📩 Notificar a ${subscription.shop.owner.email}: Suscripción vence en ${daysLeft} días`,
      );

      // TODO: Implementar envío de email
      // await this.emailService.sendExpirationWarning(subscription);
    }

    this.logger.log(`✅ ${upcomingExpirations.length} notificaciones enviadas`);
  }

  /**
   * 🆕 Cron job: Procesar renovaciones automáticas (5 días antes de vencer)
   * Se ejecuta diariamente a las 8 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async processAutoRenewals() {
    this.logger.log('🔄 Procesando renovaciones automáticas...');

    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    fiveDaysFromNow.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Buscar suscripciones activas con autoRenew habilitado que vencen en 5 días
    const subscriptionsToRenew = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.shop', 'shop')
      .leftJoinAndSelect('shop.owner', 'owner')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.autoRenew = :autoRenew', { autoRenew: true })
      .andWhere('subscription.endDate >= :today', { today })
      .andWhere('subscription.endDate <= :fiveDays', { fiveDays: fiveDaysFromNow })
      .getMany();

    this.logger.log(`📋 Encontradas ${subscriptionsToRenew.length} suscripciones para renovar`);

    for (const subscription of subscriptionsToRenew) {
      try {
        // Generar link de pago para renovación
        const preference = await this.mercadoPagoService.createSubscriptionPreference(
          subscription.id,
          subscription.shopId,
          subscription.plan,
        );

        // Actualizar la preferencia de MP en la suscripción
        subscription.mercadoPagoPreapprovalId = preference.id;
        await this.subscriptionRepository.save(subscription);

        const daysLeft = this.getDaysUntilExpiration(subscription.endDate);

        this.logger.log(
          `💳 Link de renovación generado para suscripción ${subscription.id} - Vence en ${daysLeft} días`,
        );

        // TODO: Enviar email con link de pago
        // await this.emailService.sendRenewalLink(subscription, preference.initPoint);

        this.logger.log(
          `📧 Email de renovación enviado a ${subscription.shop.owner.email}`,
        );
      } catch (error) {
        this.logger.error(
          `❌ Error al procesar renovación para suscripción ${subscription.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`✅ Procesamiento de renovaciones completado`);
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
    const [active, expired, pending, cancelled, failed] = await Promise.all([
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.PENDING } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.CANCELLED } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.FAILED } }),
    ]);

    return {
      total: active + expired + pending + cancelled + failed,
      active,
      expired,
      pending,
      cancelled,
      failed,
    };
  }
}