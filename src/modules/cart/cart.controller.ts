import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el carrito del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Carrito obtenido exitosamente' })
  getCart(@CurrentUser() user: User) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  @ApiOperation({ summary: 'Agregar producto al carrito' })
  @ApiResponse({ status: 201, description: 'Producto agregado al carrito' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  addToCart(@CurrentUser() user: User, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(user, addToCartDto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad de un ítem del carrito' })
  @ApiResponse({ status: 200, description: 'Cantidad actualizada' })
  @ApiResponse({ status: 400, description: 'Stock insuficiente' })
  @ApiResponse({ status: 404, description: 'Ítem no encontrado' })
  updateCartItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user, itemId, updateCartItemDto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Eliminar un ítem del carrito' })
  @ApiResponse({ status: 200, description: 'Producto eliminado del carrito' })
  @ApiResponse({ status: 404, description: 'Ítem no encontrado' })
  removeCartItem(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.cartService.removeCartItem(user, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Vaciar el carrito completo' })
  @ApiResponse({ status: 200, description: 'Carrito vaciado exitosamente' })
  clearCart(@CurrentUser() user: User) {
    return this.cartService.clearCart(user);
  }
}
