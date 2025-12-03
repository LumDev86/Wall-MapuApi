import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from '../services/subscriptions.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';
import {
  CreateSubscriptionDto,
  SubscriptionResponseDto,
  PaymentStatusResponseDto,
} from '../dtos';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una nueva suscripción con pago (Solo RETAILER/WHOLESALER)' })
  @ApiResponse({
    status: 201,
    description: 'Suscripción creada exitosamente',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Ya tienes una suscripción activa' })
  @ApiResponse({ status: 403, description: 'No tienes permisos (debes ser RETAILER o WHOLESALER)' })
  async create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @CurrentUser() user: User,
  ) {
    return this.subscriptionsService.create(createSubscriptionDto, user);
  }

  @Get('me')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mi suscripción actual (Solo RETAILER/WHOLESALER)' })
  @ApiResponse({ status: 200, description: 'Suscripción encontrada' })
  @ApiResponse({ status: 404, description: 'No tienes ninguna suscripción' })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  async getMySubscription(@CurrentUser() user: User) {
    return this.subscriptionsService.findMySubscription(user.id);
  }

  @Get(':id/payment-status')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener estado del pago de una suscripción (Solo RETAILER/WHOLESALER)' })
  @ApiResponse({
    status: 200,
    description: 'Estado del pago',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  async getPaymentStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.subscriptionsService.getPaymentStatus(id, user.id);
  }

  @Post(':id/retry-payment')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reintentar pago de una suscripción (Solo RETAILER/WHOLESALER)' })
  @ApiResponse({ status: 200, description: 'Nuevo link de pago generado' })
  @ApiResponse({
    status: 400,
    description: 'Límite de intentos alcanzado o estado inválido',
  })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  async retryPayment(@Param('id') id: string, @CurrentUser() user: User) {
    return this.subscriptionsService.retryPayment(id, user);
  }

  @Delete(':id/cancel')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar una suscripción (Solo RETAILER/WHOLESALER)' })
  @ApiResponse({ status: 200, description: 'Suscripción cancelada' })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  async cancelSubscription(@Param('id') id: string, @CurrentUser() user: User) {
    return this.subscriptionsService.cancelSubscription(id, user.id);
  }

  @Post(':id/toggle-auto-renew')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activar/desactivar renovación automática (Solo RETAILER/WHOLESALER)',
  })
  @ApiResponse({
    status: 200,
    description: 'Renovación automática actualizada',
  })
  @ApiResponse({ status: 403, description: 'No tienes permisos' })
  async toggleAutoRenew(@Param('id') id: string, @CurrentUser() user: User) {
    return this.subscriptionsService.toggleAutoRenew(id, user.id);
  }
}
