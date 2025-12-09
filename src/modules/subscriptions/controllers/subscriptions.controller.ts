import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpStatus,
  Query,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

import { SubscriptionsService } from '../services/subscriptions.service';
import { CreateSubscriptionDto, FilterSubscriptionsDto } from '../dtos';
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
  // 🔵 LISTAR TODAS LAS SUSCRIPCIONES (ADMIN)
  // -------------------------------------------------------------
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar todas las suscripciones con filtros (solo admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de suscripciones',
    schema: {
      example: {
        data: [
          {
            id: 'uuid-123',
            plan: 'retailer',
            status: 'active',
            amount: 18000,
            userId: 'uuid-456',
            user: {
              id: 'uuid-456',
              email: 'user@example.com',
              name: 'John Doe'
            },
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        meta: {
          total: 50,
          page: 1,
          limit: 10,
          totalPages: 5
        }
      }
    }
  })
  async findAll(@Query() filters: FilterSubscriptionsDto) {
    return this.service.findAll(filters);
  }

  // -------------------------------------------------------------
  // 🔵 VER MI HISTORIAL DE SUSCRIPCIONES
  // -------------------------------------------------------------
  @Get('history')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER, UserRole.CLIENT)
  @ApiOperation({ summary: 'Ver mi historial completo de suscripciones' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Número de página (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Resultados por página (default: 10, max: 100)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Historial de suscripciones del usuario',
    schema: {
      example: {
        data: [
          {
            id: 'uuid-123',
            plan: 'retailer',
            status: 'active',
            amount: 18000,
            startDate: '2024-01-01T00:00:00.000Z',
            nextPaymentDate: '2024-02-01T00:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ],
        meta: {
          total: 3,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      }
    }
  })
  async getMyHistory(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.service.findUserHistory(user.id, page, limit);
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

  // -------------------------------------------------------------
  // 🔵 CANCELAR MI SUSCRIPCIÓN
  // -------------------------------------------------------------
  @Delete('me')
  @Roles(UserRole.RETAILER, UserRole.WHOLESALER)
  @ApiOperation({
    summary: 'Cancelar mi suscripción actual',
    description: 'Cancela la suscripción activa del usuario y desactiva sus shops'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Suscripción cancelada exitosamente',
    schema: {
      example: {
        message: 'Suscripción cancelada exitosamente',
        subscription: {
          id: 'uuid-123',
          plan: 'retailer',
          status: 'cancelled',
          amount: 18000,
          autoRenew: false
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No hay suscripción activa para cancelar'
  })
  async cancelMySubscription(@CurrentUser() user: User) {
    return this.service.cancelMySubscription(user.id);
  }
}
