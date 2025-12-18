import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private newUsersToday: number = 0;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
  ) {
    this.updateNewUsersToday();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'reset-new-users-counter',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  async resetNewUsersCounter() {
    this.logger.log('🔄 Reseteando contador de usuarios nuevos del día');
    this.newUsersToday = 0;
    await this.updateNewUsersToday();
    this.logger.log(`✅ Contador reseteado. Nuevos usuarios hoy: ${this.newUsersToday}`);
  }

  private async updateNewUsersToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.newUsersToday = await this.userRepository.count({
      where: { createdAt: Between(today, tomorrow) },
    });
  }

  async getDashboardMetrics() {
    await this.updateNewUsersToday();
    const totalUsers = await this.userRepository.count();
    const clients = await this.userRepository.count({ where: { role: UserRole.CLIENT } });
    const retailers = await this.userRepository.count({ where: { role: UserRole.RETAILER } });
    const wholesalers = await this.userRepository.count({ where: { role: UserRole.WHOLESALER } });
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newUsers7Days = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(last7Days) },
    });
    const newUsers30Days = await this.userRepository.count({
      where: { createdAt: MoreThanOrEqual(last30Days) },
    });
    const totalSubscriptions = await this.subscriptionRepository.count();
    const activeSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE },
    });
    const pendingSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.PENDING },
    });
    const cancelledSubscriptions = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.CANCELLED },
    });
    const usersWithActiveSubscription = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('COUNT(DISTINCT subscription.userId)', 'count')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .getRawOne();
    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newToday: this.newUsersToday,
        new7Days: newUsers7Days,
        new30Days: newUsers30Days,
        byRole: { clients, retailers, wholesalers },
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        pending: pendingSubscriptions,
        cancelled: cancelledSubscriptions,
        usersWithActiveSubscription: parseInt(usersWithActiveSubscription?.count || '0'),
      },
    };
  }

  async getUserStats() {
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();
    const usersWithSubscription = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.subscriptions', 'subscription')
      .select('user.role', 'role')
      .addSelect('subscription.plan', 'plan')
      .addSelect('subscription.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.id IS NOT NULL')
      .groupBy('user.role')
      .addGroupBy('subscription.plan')
      .addGroupBy('subscription.status')
      .getRawMany();
    return { usersByRole, usersWithSubscription };
  }

  async getUserRegistrationTrend(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE(user.createdAt AT TIME ZONE 'America/Argentina/Buenos_Aires')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();
    return {
      period: `${days} days`,
      data: users.map(u => ({ date: u.date, count: parseInt(u.count) })),
    };
  }

  async getSubscriptionTrend(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select("DATE(subscription.createdAt AT TIME ZONE 'America/Argentina/Buenos_Aires')", 'date')
      .addSelect('subscription.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.createdAt >= :startDate', { startDate })
      .groupBy('date')
      .addGroupBy('subscription.status')
      .orderBy('date', 'ASC')
      .getRawMany();
    return {
      period: `${days} days`,
      data: subscriptions.map(s => ({ date: s.date, status: s.status, count: parseInt(s.count) })),
    };
  }

  async getUsersByProvince() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select('user.province', 'province')
      .addSelect('COUNT(*)', 'count')
      .where('user.province IS NOT NULL')
      .groupBy('user.province')
      .orderBy('count', 'DESC')
      .getRawMany();
    return users.map(u => ({ province: u.province, count: parseInt(u.count) }));
  }

  async getShopsRankingByClicks(limit: number = 10) {
    const shops = await this.shopRepository
      .createQueryBuilder('shop')
      .leftJoinAndSelect('shop.owner', 'owner')
      .where('shop.isActive = :isActive', { isActive: true })
      .orderBy('shop.clickCount', 'DESC')
      .limit(limit)
      .getMany();
    return shops.map(shop => ({
      id: shop.id,
      name: shop.name,
      type: shop.type,
      clickCount: shop.clickCount,
      province: shop.province,
      city: shop.city,
      owner: {
        id: shop.owner?.id,
        name: shop.owner?.name,
        email: shop.owner?.email,
      },
    }));
  }
}
