import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('users')
  @ApiOperation({
    summary: 'Generar reporte PDF de usuarios (Solo Admin)',
    description: 'Genera un reporte en PDF con la lista de usuarios y sus datos',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filtrar por rol de usuario',
  })
  @ApiQuery({
    name: 'province',
    required: false,
    description: 'Filtrar por provincia',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getUsersReport(
    @Res() res: Response,
    @Query('role') role?: UserRole,
    @Query('province') province?: string,
  ) {
    return this.reportsService.generateUsersReport(res, { role, province });
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'Generar reporte PDF de suscripciones (Solo Admin)',
    description: 'Genera un reporte en PDF con la lista de suscripciones',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por estado de suscripción',
  })
  @ApiQuery({
    name: 'plan',
    required: false,
    description: 'Filtrar por tipo de plan',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Fecha de fin (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getSubscriptionsReport(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.generateSubscriptionsReport(res, {
      status,
      plan,
      startDate,
      endDate,
    });
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Generar reporte PDF de tickets (Solo Admin)',
    description: 'Genera un reporte en PDF con la lista de tickets de soporte',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtrar por estado del ticket',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    description: 'Filtrar por prioridad',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filtrar por categoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getTicketsReport(
    @Res() res: Response,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
  ) {
    return this.reportsService.generateTicketsReport(res, { status, priority, category });
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Generar reporte PDF de analíticas (Solo Admin)',
    description: 'Genera un reporte en PDF con las métricas del dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Reporte PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getAnalyticsReport(@Res() res: Response) {
    return this.reportsService.generateAnalyticsReport(res);
  }
}
