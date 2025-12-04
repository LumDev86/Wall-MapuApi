import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

import { SubscriptionsService } from '../services/subscriptions.service';
import { CreateSubscriptionDto } from '../dtos';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../users/entities/user.entity';

import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  // -------------------------------------------------------------
  // 🔵 CREAR SUSCRIPCIÓN
  // -------------------------------------------------------------
  @Post()
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear suscripción mensual' })
  @ApiBody({
    description: 'Datos necesarios para crear una suscripción',
    schema: {
      example: {
        plan: "retailer",
        autoRenew: true
      }
    }
  })
  @ApiResponse({
  status: HttpStatus.CREATED,
  description: 'Suscripción creada y preference generada',
  schema: {
    example: {
      subscriptionId: "uuid-123",
      preferenceId: "pref-xyz-123",
      init_point: "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123"
    }
  }
  })
  async create(@Body() dto: CreateSubscriptionDto, @CurrentUser() user: User) {
    return this.service.create(dto, user);
  }

  // -------------------------------------------------------------
  // 🔵 OBTENER MI SUSCRIPCIÓN
  // -------------------------------------------------------------
  @Get('me')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiOperation({ summary: 'Obtener mi suscripción actual' })
  async getMySubscription(@CurrentUser() user: User) {
    return this.service.findMySubscription(user.id);
  }
}
