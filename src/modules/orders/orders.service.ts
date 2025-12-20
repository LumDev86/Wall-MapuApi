import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { User } from '../users/entities/user.entity';
import { CartService } from '../cart/cart.service';
import { MercadoPagoService } from '../../common/services/mercadopago.service';
import { OrderResponseDto } from './dtos/order-response.dto';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private cartService: CartService,
    private mercadoPagoService: MercadoPagoService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async createCheckout(user: User) {
    const cart = await this.cartService.getCart(user);

    if (!cart.items || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    // Verificar stock de todos los productos
    for (const item of cart.items) {
      if (item.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${item.productName}. Disponible: ${item.stock}`,
        );
      }
    }

    // Crear la orden
    const order = this.orderRepository.create({
      userId: user.id,
      totalAmount: cart.totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Crear los items de la orden
    const orderItems = cart.items.map((cartItem) => {
      return this.orderItemRepository.create({
        orderId: savedOrder.id,
        productId: cartItem.productId,
        productName: cartItem.productName,
        quantity: cartItem.quantity,
        price: cartItem.priceAtAddition,
        subtotal: cartItem.subtotal,
        shopId: cartItem.shopId,
        shopName: cartItem.shopName,
      });
    });

    await this.orderItemRepository.save(orderItems);

    // Generar preferencia de pago en MercadoPago
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const backendUrl = this.configService.get('BACKEND_URL');

      const preference = await this.mercadoPagoService.createPreference({
        id: savedOrder.id,
        title: `Orden #${savedOrder.id.substring(0, 8)}`,
        amount: Number(cart.totalAmount),
        user: user,
        type: 'order',
        successUrl: `${frontendUrl}/orders/success`,
        failureUrl: `${frontendUrl}/orders/failure`,
        notificationUrl: `${backendUrl}/api/orders/webhook/mercadopago`,
      });

      // Actualizar la orden con la información de MercadoPago
      savedOrder.preferenceId = preference.id || null;
      savedOrder.paymentUrl = preference.init_point || null;
      await this.orderRepository.save(savedOrder);

      // Vaciar el carrito después de crear la orden
      await this.cartService.clearCart(user);

      // Cargar la orden con sus items
      const orderWithItems = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['items'],
      });

      if (!orderWithItems) {
        throw new NotFoundException('Error al cargar la orden');
      }

      return {
        message: 'Checkout creado exitosamente',
        order: OrderResponseDto.fromEntity(orderWithItems),
      };
    } catch (error) {
      this.logger.error('Error al crear preferencia de MercadoPago', error);
      throw new BadRequestException(
        'Error al generar el link de pago. Intenta nuevamente.',
      );
    }
  }

  async getOrders(user: User) {
    const orders = await this.orderRepository.find({
      where: { userId: user.id },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: orders.map(order => OrderResponseDto.fromEntity(order)),
      total: orders.length,
    };
  }

  async getOrder(user: User, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, userId: user.id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return OrderResponseDto.fromEntity(order);
  }

  async processPaymentWebhook(paymentId: string) {
    this.logger.log(`Procesando webhook de pago: ${paymentId}`);

    try {
      const payment = await this.mercadoPagoService.getPayment(paymentId);

      this.logger.debug(`Información del pago: ${JSON.stringify(payment)}`);

      const orderId = payment.external_reference;
      const paymentStatus = payment.status;

      if (!orderId) {
        this.logger.warn('El pago no tiene external_reference (orderId)');
        return { message: 'Pago sin referencia externa' };
      }

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`Orden no encontrada: ${orderId}`);
        return { message: 'Orden no encontrada' };
      }

      // Actualizar el estado de la orden según el estado del pago
      order.paymentId = paymentId;

      if (paymentStatus === 'approved') {
        order.status = OrderStatus.PAID;
        this.logger.log(`✅ Orden ${orderId} marcada como PAID`);

        // Enviar email de confirmación de compra
        try {
          const user = await this.userRepository.findOne({ where: { id: order.userId } });
          const orderWithItems = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items'],
          });

          if (user && orderWithItems) {
            await this.mailService.sendOrderConfirmationEmail({
              to: user.email,
              name: user.name,
              orderId: order.id,
              totalAmount: Number(order.totalAmount),
              itemsCount: orderWithItems.items.length,
            });
            this.logger.log(`📧 Email de confirmación enviado a ${user.email}`);
          }
        } catch (emailError) {
          this.logger.error('Error al enviar email de confirmación:', emailError);
          // No lanzar error, la confirmación de pago debe completarse aunque falle el email
        }
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        order.status = OrderStatus.FAILED;
        this.logger.log(`❌ Orden ${orderId} marcada como FAILED`);
      } else {
        this.logger.log(`⏳ Pago en estado: ${paymentStatus}`);
      }

      await this.orderRepository.save(order);

      return {
        message: 'Webhook procesado correctamente',
        orderId: order.id,
        status: order.status,
      };
    } catch (error) {
      this.logger.error('Error procesando webhook', error);
      throw error;
    }
  }
}
