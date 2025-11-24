import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Subscription } from './entities/subscription.entity';
import { Shop } from '../shops/entities/shop.entity';
import { SubscriptionsService } from './services/subscriptions.service';
import { MercadoPagoService } from './services/mercadopago.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Shop]),
    ConfigModule,
    ScheduleModule.forRoot(), // Para los cron jobs
    RedisModule,
  ],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [SubscriptionsService, MercadoPagoService],
  exports: [SubscriptionsService, MercadoPagoService],
})
export class SubscriptionsModule {}
