import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { ReplyTicketDto } from './dtos/reply-ticket.dto';
import { FilterTicketsDto } from './dtos/filter-tickets.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un nuevo ticket',
    description: 'Permite a cualquier usuario crear un ticket de soporte',
  })
  @ApiResponse({
    status: 201,
    description: 'Ticket creado exitosamente',
  })
  create(@CurrentUser() user: User, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(user, createTicketDto);
  }

  @Get('my-tickets')
  @ApiOperation({
    summary: 'Obtener mis tickets',
    description: 'Retorna todos los tickets creados por el usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets del usuario',
  })
  getUserTickets(@CurrentUser() user: User) {
    return this.ticketsService.getUserTickets(user);
  }

  @Get('crm/list')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar tickets con filtros para CRM (Solo Admin)',
    description: 'Obtiene lista de tickets con filtros avanzados y paginación para el panel de administración',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tickets obtenida exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No autorizado. Solo administradores pueden acceder.',
  })
  getTicketsForCrm(@Query() filters: FilterTicketsDto) {
    return this.ticketsService.getTicketsForCrm(filters);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener estadísticas de tickets (Solo Admin)',
    description: 'Retorna estadísticas de tickets por estado para el dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
  })
  getTicketStats() {
    return this.ticketsService.getTicketStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener un ticket específico',
    description: 'Retorna el detalle completo de un ticket con sus mensajes',
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket obtenido exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para ver este ticket',
  })
  getTicket(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ticketsService.getTicket(id, user);
  }

  @Post(':id/reply')
  @ApiOperation({
    summary: 'Responder a un ticket',
    description: 'Permite al propietario del ticket o a un admin responder',
  })
  @ApiResponse({
    status: 201,
    description: 'Respuesta enviada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket no encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para responder este ticket',
  })
  replyToTicket(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() replyTicketDto: ReplyTicketDto,
  ) {
    return this.ticketsService.replyToTicket(id, user, replyTicketDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar estado del ticket (Solo Admin)',
    description: 'Permite a un admin cambiar el estado de un ticket',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado actualizado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Ticket no encontrado',
  })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateTicketStatusDto) {
    return this.ticketsService.updateStatus(id, updateStatusDto);
  }
}
