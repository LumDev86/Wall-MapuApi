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
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
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
    description: 'Crea una nueva suscripción y genera el link de pago de Mercado Pago'
  })
  @ApiResponse({
    status: 201,
    description: 'Suscripción creada exitosamente. Retorna el link de pago.',
  })
  @ApiResponse({
    status: 400,
    description: 'El shop ya tiene una suscripción activa o el plan no coincide con el tipo de shop',
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

  @Get('shop/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener suscripción de un shop (HU-011)',
    description: 'Ver el estado actual de la suscripción del shop'
  })
  @ApiResponse({
    status: 200,
    description: 'Información de la suscripción',
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
    description: 'Cancela la renovación automática. El shop permanece activo hasta la fecha de vencimiento.'
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
    description: 'Ver totales de suscripciones por estado'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de suscripciones',
  })
  getStats() {
    return this.subscriptionsService.getStats();
  }
}