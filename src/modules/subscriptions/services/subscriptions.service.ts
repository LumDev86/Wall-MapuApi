import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';

import { Subscription, SubscriptionStatus, SubscriptionPlan } from '../entities/subscription.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { ShopStatus } from '../../shops/entities/shop.entity';

import { MercadoPagoService } from '../../../common/services/mercadopago.service';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { FilterSubscriptionsDto } from '../dtos/filter-subscriptions.dto';
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
      where: {
        userId,
        status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]),
      },
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

  // -------------------------------------------------------------
  // 🔵 LISTAR TODAS LAS SUSCRIPCIONES (ADMIN)
  // -------------------------------------------------------------
  async findAll(filters: FilterSubscriptionsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.subsRepo
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user');

    // Filtro de búsqueda por nombre o email
    if (filters.search) {
      query.andWhere(
        '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    // Aplicar filtros
    if (filters.status) {
      query.andWhere('subscription.status = :status', { status: filters.status });
    }

    if (filters.plan) {
      query.andWhere('subscription.plan = :plan', { plan: filters.plan });
    }

    if (filters.userId) {
      query.andWhere('subscription.userId = :userId', { userId: filters.userId });
    }

    // Filtro por rango de fechas
    if (filters.startDate && filters.endDate) {
      query.andWhere('subscription.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate),
      });
    } else if (filters.startDate) {
      query.andWhere('subscription.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    } else if (filters.endDate) {
      query.andWhere('subscription.createdAt <= :endDate', {
        endDate: new Date(filters.endDate),
      });
    }

    // Contar total
    const total = await query.getCount();

    // Aplicar paginación y ordenar
    query.skip(skip).take(limit).orderBy('subscription.createdAt', 'DESC');

    const data = await query.getMany();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------
  // 🔵 VER MI HISTORIAL DE SUSCRIPCIONES
  // -------------------------------------------------------------
  async findUserHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.subsRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------
  // 🔵 CANCELAR MI SUSCRIPCIÓN
  // -------------------------------------------------------------
  async cancelMySubscription(userId: string) {
    const subscription = await this.subsRepo.findOne({
      where: {
        userId,
        status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]),
      },
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      throw new NotFoundException('No tienes una suscripción activa o pendiente para cancelar');
    }

    // Cambiar estado a cancelado
    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.autoRenew = false;
    await this.subsRepo.save(subscription);

    // Desactivar los shops del usuario
    const shops = await this.shopRepo.find({ where: { owner: { id: userId } } });
    for (const shop of shops) {
      shop.status = ShopStatus.SUSPENDED;
      await this.shopRepo.save(shop);
    }

    return {
      message: 'Suscripción cancelada exitosamente',
      subscription,
    };
  }

  // -------------------------------------------------------------
  // 🔵 ESTADÍSTICAS DE SUSCRIPCIONES (ADMIN)
  // -------------------------------------------------------------
  async getSubscriptionStats() {
    const total = await this.subsRepo.count();
    const active = await this.subsRepo.count({ where: { status: SubscriptionStatus.ACTIVE } });
    const pending = await this.subsRepo.count({ where: { status: SubscriptionStatus.PENDING } });
    const cancelled = await this.subsRepo.count({ where: { status: SubscriptionStatus.CANCELLED } });
    const expired = await this.subsRepo.count({ where: { status: SubscriptionStatus.EXPIRED } });

    // Contar por plan (solo activas)
    const retailerActive = await this.subsRepo.count({
      where: { plan: SubscriptionPlan.RETAILER, status: SubscriptionStatus.ACTIVE },
    });
    const wholesalerActive = await this.subsRepo.count({
      where: { plan: SubscriptionPlan.WHOLESALER, status: SubscriptionStatus.ACTIVE },
    });

    // Calcular ingresos mensuales proyectados (solo suscripciones activas)
    const monthlyRevenue = retailerActive * this.PLAN_PRICES.retailer + wholesalerActive * this.PLAN_PRICES.wholesaler;

    // Calcular tasa de renovación (subscripciones con autoRenew activo)
    const withAutoRenew = await this.subsRepo.count({
      where: { status: SubscriptionStatus.ACTIVE, autoRenew: true },
    });
    const renewalRate = active > 0 ? ((withAutoRenew / active) * 100).toFixed(2) : '0';

    return {
      total,
      byStatus: {
        active,
        pending,
        cancelled,
        expired,
      },
      byPlan: {
        retailer: retailerActive,
        wholesaler: wholesalerActive,
      },
      revenue: {
        monthlyProjected: monthlyRevenue,
        currency: 'ARS',
      },
      renewalRate: `${renewalRate}%`,
      activeWithAutoRenew: withAutoRenew,
    };
  }
}
