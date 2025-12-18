import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener métricas del dashboard CRM',
    description: 'Retorna métricas generales: usuarios totales, por tipo, suscripciones, nuevos del día, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas obtenidas exitosamente',
  })
  getDashboardMetrics() {
    return this.analyticsService.getDashboardMetrics();
  }

  @Get('users/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Estadísticas detalladas de usuarios',
    description: 'Obtiene usuarios por rol y usuarios con suscripción',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  getUserStats() {
    return this.analyticsService.getUserStats();
  }

  @Get('users/registration-trend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tendencia de registro de usuarios',
    description: 'Obtiene la cantidad de usuarios registrados por día en el período especificado',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Número de días hacia atrás (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencia obtenida exitosamente',
  })
  getUserRegistrationTrend(@Query('days') days?: string) {
    const numDays = days ? parseInt(days) : 30;
    return this.analyticsService.getUserRegistrationTrend(numDays);
  }

  @Get('subscriptions/trend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tendencia de suscripciones',
    description: 'Obtiene la cantidad de suscripciones por día y estado en el período especificado',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Número de días hacia atrás (default: 30)',
    example: 30,
  })
  @ApiResponse({
    status: 200,
    description: 'Tendencia obtenida exitosamente',
  })
  getSubscriptionTrend(@Query('days') days?: string) {
    const numDays = days ? parseInt(days) : 30;
    return this.analyticsService.getSubscriptionTrend(numDays);
  }

  @Get('users/by-province')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Usuarios por provincia',
    description: 'Obtiene la distribución de usuarios por provincia',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución obtenida exitosamente',
  })
  getUsersByProvince() {
    return this.analyticsService.getUsersByProvince();
  }
}
