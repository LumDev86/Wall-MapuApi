import { ApiProperty } from '@nestjs/swagger';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';

export class OrderItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  shopId: string;

  @ApiProperty()
  shopName: string;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      price: Number(item.price),
      subtotal: Number(item.subtotal),
      shopId: item.shopId,
      shopName: item.shopName,
    };
  }
}

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: OrderStatus;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ nullable: true })
  paymentUrl: string | null;

  @ApiProperty({ nullable: true })
  preferenceId: string | null;

  @ApiProperty({ nullable: true })
  paymentId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(order: Order): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      items: order.items.map(item => OrderItemResponseDto.fromEntity(item)),
      paymentUrl: order.paymentUrl || null,
      preferenceId: order.preferenceId || null,
      paymentId: order.paymentId || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
