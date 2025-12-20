import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Subscription } from './entities/subscription.entity';
import { Shop } from '../shops/entities/shop.entity';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { WebhooksController } from './controllers/webhooks.controller';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Shop]),
    ConfigModule,
    MailModule,
  ],
  controllers: [SubscriptionsController, WebhooksController],
  providers: [SubscriptionsService, MercadoPagoService],
  exports: [SubscriptionsService, TypeOrmModule],
})
export class SubscriptionsModule {}
