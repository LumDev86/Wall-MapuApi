import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateTicketDto } from './dtos/create-ticket.dto';
import { UpdateTicketStatusDto } from './dtos/update-ticket-status.dto';
import { ReplyTicketDto } from './dtos/reply-ticket.dto';
import { FilterTicketsDto } from './dtos/filter-tickets.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private ticketMessageRepository: Repository<TicketMessage>,
  ) {}

  /**
   * Crear un nuevo ticket
   */
  async create(user: User, createTicketDto: CreateTicketDto) {
    const ticket = this.ticketRepository.create({
      userId: user.id,
      subject: createTicketDto.subject,
      message: createTicketDto.message,
      category: createTicketDto.category,
      priority: createTicketDto.priority,
    });

    const savedTicket = await this.ticketRepository.save(ticket);

    return {
      message: 'Ticket creado exitosamente',
      ticket: savedTicket,
    };
  }

  /**
   * Obtener todos los tickets del usuario
   */
  async getUserTickets(user: User) {
    const tickets = await this.ticketRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    return {
      data: tickets,
      total: tickets.length,
    };
  }

  /**
   * Obtener un ticket específico con sus mensajes
   */
  async getTicket(ticketId: string, user: User) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['user', 'messages', 'messages.sender'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // Verificar que el usuario tenga permiso para ver este ticket
    if (ticket.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para ver este ticket');
    }

    return ticket;
  }

  /**
   * Responder a un ticket (usuario o admin)
   */
  async replyToTicket(ticketId: string, user: User, replyTicketDto: ReplyTicketDto) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // Verificar permisos
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner = ticket.userId === user.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('No tienes permiso para responder este ticket');
    }

    // Crear el mensaje
    const message = this.ticketMessageRepository.create({
      ticketId: ticket.id,
      senderId: user.id,
      message: replyTicketDto.message,
      isAdminReply: isAdmin,
    });

    await this.ticketMessageRepository.save(message);

    // Si el admin responde, cambiar estado a "in_progress" si está en "open"
    if (isAdmin && ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketRepository.save(ticket);
    }

    return {
      message: 'Respuesta enviada exitosamente',
      reply: message,
    };
  }

  /**
   * Actualizar estado del ticket (solo admin)
   */
  async updateStatus(ticketId: string, updateStatusDto: UpdateTicketStatusDto) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    ticket.status = updateStatusDto.status;

    // Si se cierra o resuelve, guardar fecha de cierre
    if (
      updateStatusDto.status === TicketStatus.CLOSED ||
      updateStatusDto.status === TicketStatus.RESOLVED
    ) {
      ticket.closedAt = new Date();
    }

    await this.ticketRepository.save(ticket);

    return {
      message: 'Estado actualizado exitosamente',
      ticket,
    };
  }

  /**
   * Obtener tickets con filtros para CRM (solo admin)
   */
  async getTicketsForCrm(filters: FilterTicketsDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user');

    // Filtro de búsqueda
    if (filters.search) {
      query.andWhere(
        '(LOWER(ticket.subject) LIKE LOWER(:search) OR LOWER(user.name) LIKE LOWER(:search) OR LOWER(ticket.id) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    // Filtro por estado
    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    // Filtro por prioridad
    if (filters.priority) {
      query.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    // Filtro por categoría
    if (filters.category) {
      query.andWhere('ticket.category = :category', { category: filters.category });
    }

    // Contar total
    const total = await query.getCount();

    // Aplicar paginación y ordenar
    query.skip(skip).take(limit).orderBy('ticket.createdAt', 'DESC');

    const tickets = await query.getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data: tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener estadísticas de tickets (para el dashboard)
   */
  async getTicketStats() {
    const total = await this.ticketRepository.count();
    const open = await this.ticketRepository.count({ where: { status: TicketStatus.OPEN } });
    const inProgress = await this.ticketRepository.count({
      where: { status: TicketStatus.IN_PROGRESS },
    });
    const resolved = await this.ticketRepository.count({
      where: { status: TicketStatus.RESOLVED },
    });
    const closed = await this.ticketRepository.count({ where: { status: TicketStatus.CLOSED } });

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      openAndInProgress: open + inProgress,
    };
  }
}
