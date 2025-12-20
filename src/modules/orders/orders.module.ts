import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { CartModule } from '../cart/cart.module';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, User]),
    CartModule,
    MailModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, MercadoPagoService],
  exports: [OrdersService],
})
export class OrdersModule {}
