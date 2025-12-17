import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { CartResponseDto } from './dtos/cart-response.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getOrCreateCart(user: User): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { userId: user.id },
      relations: ['items', 'items.product', 'items.product.shop'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        userId: user.id,
        items: [],
      });
      cart = await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCart(user: User) {
    const cart = await this.getOrCreateCart(user);
    return CartResponseDto.fromEntity(cart);
  }

  async addToCart(user: User, addToCartDto: AddToCartDto) {
    const { productId, quantity = 1 } = addToCartDto;

    const product = await this.productRepository.findOne({
      where: { id: productId, isActive: true },
      relations: ['shop'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado o no disponible');
    }

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${product.stock}`,
      );
    }

    const cart = await this.getOrCreateCart(user);

    const existingItem = cart.items.find(
      (item) => item.productId === productId,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${product.stock}, en carrito: ${existingItem.quantity}`,
        );
      }

      existingItem.quantity = newQuantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      const cartItem = this.cartItemRepository.create({
        cartId: cart.id,
        productId: product.id,
        quantity,
        priceAtAddition: product.priceRetail,
      });
      await this.cartItemRepository.save(cartItem);
    }

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product', 'items.product.shop'],
    });

    if (!updatedCart) {
      throw new NotFoundException('Error al cargar el carrito');
    }

    return {
      message: 'Producto agregado al carrito',
      cart: CartResponseDto.fromEntity(updatedCart),
    };
  }

  async updateCartItem(
    user: User,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.getOrCreateCart(user);

    const cartItem = cart.items.find((item) => item.id === itemId);

    if (!cartItem) {
      throw new NotFoundException('Ítem no encontrado en el carrito');
    }

    if (cartItem.product.stock < updateCartItemDto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${cartItem.product.stock}`,
      );
    }

    cartItem.quantity = updateCartItemDto.quantity;
    await this.cartItemRepository.save(cartItem);

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product', 'items.product.shop'],
    });

    if (!updatedCart) {
      throw new NotFoundException('Error al cargar el carrito');
    }

    return {
      message: 'Cantidad actualizada',
      cart: CartResponseDto.fromEntity(updatedCart),
    };
  }

  async removeCartItem(user: User, itemId: string) {
    const cart = await this.getOrCreateCart(user);

    const cartItem = cart.items.find((item) => item.id === itemId);

    if (!cartItem) {
      throw new NotFoundException('Ítem no encontrado en el carrito');
    }

    await this.cartItemRepository.remove(cartItem);

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product', 'items.product.shop'],
    });

    if (!updatedCart) {
      throw new NotFoundException('Error al cargar el carrito');
    }

    return {
      message: 'Producto eliminado del carrito',
      cart: CartResponseDto.fromEntity(updatedCart),
    };
  }

  async clearCart(user: User) {
    const cart = await this.getOrCreateCart(user);

    await this.cartItemRepository.remove(cart.items);

    const updatedCart = await this.cartRepository.findOne({
      where: { id: cart.id },
      relations: ['items', 'items.product', 'items.product.shop'],
    });

    if (!updatedCart) {
      throw new NotFoundException('Error al cargar el carrito');
    }

    return {
      message: 'Carrito vaciado',
      cart: CartResponseDto.fromEntity(updatedCart),
    };
  }
}
