import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { MercadoPagoWebhookDto } from '../subscriptions/dtos/webhook.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Crear checkout desde el carrito',
    description: 'Genera una orden desde el carrito actual y crea el link de pago con MercadoPago',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Carrito vacío o stock insuficiente',
  })
  createCheckout(@CurrentUser() user: User) {
    return this.ordersService.createCheckout(user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener todas las órdenes del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes',
  })
  getOrders(@CurrentUser() user: User) {
    return this.ordersService.getOrders(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener detalle de una orden',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la orden',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
  })
  getOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.ordersService.getOrder(user, id);
  }

  @Post('webhook/mercadopago')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Webhook de Mercado Pago para órdenes',
    description: 'Recibe notificaciones de pagos (NO requiere auth)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook procesado correctamente',
  })
  async handleMercadoPagoWebhook(
    @Body() dto: MercadoPagoWebhookDto,
    @Headers('x-request-id') requestId?: string,
  ) {
    this.logger.log('═══════════════════════════════════════════════════════');
    this.logger.log('🔔 WEBHOOK DE MERCADO PAGO PARA ÓRDENES');
    this.logger.log(`📌 Request ID: ${requestId}`);
    this.logger.debug(`Payload recibido: ${JSON.stringify(dto)}`);
    this.logger.log('═══════════════════════════════════════════════════════');

    // Validación mínima
    if (!dto.data?.id) {
      this.logger.error('❌ Webhook inválido: falta data.id');
      throw new BadRequestException('Webhook de Mercado Pago inválido (falta data.id)');
    }

    try {
      const result = await this.ordersService.processPaymentWebhook(dto.data.id);
      this.logger.log(`✅ Webhook procesado: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error('❌ Error procesando webhook');
      this.logger.error(error.message);

      // IMPORTANTE → Mercado Pago espera SIEMPRE 200
      return {
        message: 'Webhook recibido pero falló el procesamiento interno',
        error: error.message,
      };
    }
  }
}
