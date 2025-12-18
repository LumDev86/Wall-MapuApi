import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CartModule } from '../cart/cart.module';
import { MercadoPagoService } from '../../common/services/mercadopago.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    CartModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, MercadoPagoService],
  exports: [OrdersService],
})
export class OrdersModule {}
