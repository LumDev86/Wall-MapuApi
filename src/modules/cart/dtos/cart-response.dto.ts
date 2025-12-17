import { ApiProperty } from '@nestjs/swagger';
import { Cart } from '../entities/cart.entity';
import { CartItem } from '../entities/cart-item.entity';

export class CartItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty({ nullable: true })
  productImage: string | null;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  priceAtAddition: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  shopId: string;

  @ApiProperty()
  shopName: string;

  static fromEntity(item: CartItem): CartItemResponseDto {
    return {
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      productImage: item.product.images && item.product.images.length > 0
        ? item.product.images[0]
        : null,
      quantity: item.quantity,
      priceAtAddition: Number(item.priceAtAddition),
      subtotal: Number(item.priceAtAddition) * item.quantity,
      stock: item.product.stock,
      shopId: item.product.shopId,
      shopName: item.product.shop?.name || '',
    };
  }
}

export class CartResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(cart: Cart): CartResponseDto {
    const items = cart.items.map(item => CartItemResponseDto.fromEntity(item));
    const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id,
      items,
      totalItems,
      totalAmount,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
