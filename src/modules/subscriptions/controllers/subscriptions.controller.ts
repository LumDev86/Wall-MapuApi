// ============================================
// subscriptions.controller.ts (CON DTOs)
// ============================================
import {
  Controller,
  Get,
  Post,
  Body,
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
import { SubscriptionsService } from '../services/subscriptions.service';
import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  PaymentStatusResponseDto,
  RetryPaymentResponseDto,
  SubscriptionWithShopDto,
  SubscriptionStatsDto,
} from '../dtos/index';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Crear suscripción para un shop (HU-010)',
    description: `
      Crea una nueva suscripción y genera el link de pago de Mercado Pago.
      
      **Si ya existe una suscripción PENDING o FAILED**, automáticamente genera
      un nuevo link de pago para reintentar (no crea una nueva suscripción).
      
      **Límite de reintentos**: 5 intentos máximo.
    `
  })
  @ApiResponse({
    status: 201,
    description: 'Suscripción creada exitosamente. Retorna el link de pago (initPoint).',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'El shop ya tiene una suscripción activa, el plan no coincide, o se excedió el límite de intentos',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para crear suscripción para este shop',
  })
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @CurrentUser() user: User,
  ) {
    return this.subscriptionsService.create(createSubscriptionDto, user);
  }

  @Post(':id/retry-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🆕 Reintentar pago de una suscripción fallida',
    description: `
      Genera un nuevo link de pago para una suscripción en estado PENDING o FAILED.
      
      **Casos de uso:**
      - El usuario abandonó el checkout de Mercado Pago
      - El pago fue rechazado (tarjeta sin fondos, etc.)
      - Hubo un error técnico durante el proceso de pago
      
      **Límite**: 5 intentos máximo por suscripción.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo link de pago generado exitosamente. Retorna initPoint.',
    type: RetryPaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'La suscripción no está en estado PENDING/FAILED o se excedió el límite de intentos',
  })
  @ApiResponse({
    status: 404,
    description: 'Suscripción no encontrada',
  })
  retryPayment(@Param('id') id: string, @CurrentUser() user: User) {
    return this.subscriptionsService.retryPayment(id, user);
  }

  @Get(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: '🆕 Obtener estado del pago de una suscripción',
    description: 'Consulta el estado actual del pago, si puede reintentar, y cuántos intentos quedan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del pago de la suscripción',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Suscripción no encontrada',
  })
  getPaymentStatus(@Param('id') id: string, @CurrentUser() user: User) {
    return this.subscriptionsService.getPaymentStatus(id, user);
  }

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener suscripción de un shop (HU-011)',
    description: `
      Ver el estado actual de la suscripción del shop.
      
      Retorna:
      - Datos de la suscripción
      - Días hasta la expiración
      - Si puede reintentar el pago (canRetryPayment)
      - Intentos restantes (attemptsRemaining)
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la suscripción',
    type: SubscriptionWithShopDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shop no encontrado o no tiene suscripción',
  })
  findByShop(@Param('shopId') shopId: string, @CurrentUser() user: User) {
    return this.subscriptionsService.findByShop(shopId, user);
  }

  @Delete('shop/:shopId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Cancelar suscripción (HU-011)',
    description: `
      Cancela la renovación automática de la suscripción.
      
      El shop permanece activo hasta la fecha de vencimiento actual.
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Suscripción cancelada exitosamente',
  })
  cancel(@Param('shopId') shopId: string, @CurrentUser() user: User) {
    return this.subscriptionsService.cancel(shopId, user);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Estadísticas de suscripciones (solo admin)',
    description: `
      Ver totales de suscripciones por estado.
      
      Estados:
      - ACTIVE: Pagadas y activas
      - PENDING: Esperando pago inicial
      - FAILED: Pagos fallidos (pueden reintentar)
      - EXPIRED: Vencidas
      - CANCELLED: Canceladas por el usuario
    `
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de suscripciones',
    type: SubscriptionStatsDto,
  })
  getStats() {
    return this.subscriptionsService.getStats();
  }
}

