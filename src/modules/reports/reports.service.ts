import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { PdfReportService } from '../../common/services/pdf-report.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Subscription, SubscriptionStatus, SubscriptionPlan } from '../subscriptions/entities/subscription.entity';
import { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../tickets/entities/ticket.entity';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Ticket)
    private ticketRepository: Repository<Ticket>,
    private pdfReportService: PdfReportService,
    private analyticsService: AnalyticsService,
  ) {}

  /**
   * Generar reporte de usuarios
   */
  async generateUsersReport(
    res: Response,
    filters: { role?: UserRole; province?: string },
  ): Promise<void> {
    const query = this.userRepository.createQueryBuilder('user');

    if (filters.role) {
      query.andWhere('user.role = :role', { role: filters.role });
    }

    if (filters.province) {
      query.andWhere('LOWER(user.province) = LOWER(:province)', { province: filters.province });
    }

    const users = await query.orderBy('user.createdAt', 'DESC').getMany();

    const reportData = {
      title: 'Reporte de Usuarios',
      subtitle: filters.role ? `Filtrado por rol: ${filters.role}` : undefined,
      columns: [
        { key: 'name', label: 'Nombre', width: 120 },
        { key: 'email', label: 'Email', width: 150 },
        { key: 'role', label: 'Rol', width: 80 },
        { key: 'province', label: 'Provincia', width: 100 },
        { key: 'createdAt', label: 'Fecha Registro', width: 100 },
      ],
      data: users.map((user) => ({
        name: user.name,
        email: user.email,
        role: this.translateRole(user.role),
        province: user.province || '-',
        createdAt: new Date(user.createdAt).toLocaleDateString('es-AR'),
      })),
      summary: [
        { label: 'Total de usuarios', value: users.length },
        {
          label: 'Por rol',
          value: this.getUsersByRoleSummary(users),
        },
      ],
    };

    await this.pdfReportService.generateReport(res, reportData);
  }

  /**
   * Generar reporte de suscripciones
   */
  async generateSubscriptionsReport(
    res: Response,
    filters: { status?: string; plan?: string; startDate?: string; endDate?: string },
  ): Promise<void> {
    const query = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user');

    if (filters.status) {
      query.andWhere('subscription.status = :status', { status: filters.status });
    }

    if (filters.plan) {
      query.andWhere('subscription.plan = :plan', { plan: filters.plan });
    }

    if (filters.startDate) {
      query.andWhere('subscription.createdAt >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    }

    if (filters.endDate) {
      query.andWhere('subscription.createdAt <= :endDate', {
        endDate: new Date(filters.endDate),
      });
    }

    const subscriptions = await query.orderBy('subscription.createdAt', 'DESC').getMany();

    const totalRevenue = subscriptions
      .filter((sub) => sub.status === SubscriptionStatus.ACTIVE)
      .reduce((sum, sub) => sum + Number(sub.amount), 0);

    const reportData = {
      title: 'Reporte de Suscripciones',
      subtitle: filters.status ? `Filtrado por estado: ${filters.status}` : undefined,
      columns: [
        { key: 'user.name', label: 'Usuario', width: 120 },
        { key: 'plan', label: 'Plan', width: 80 },
        { key: 'status', label: 'Estado', width: 80 },
        { key: 'amount', label: 'Monto (ARS)', width: 80 },
        { key: 'createdAt', label: 'Fecha Creación', width: 90 },
        { key: 'nextPaymentDate', label: 'Próximo Pago', width: 90 },
      ],
      data: subscriptions.map((sub) => ({
        user: { name: sub.user?.name || 'N/A' },
        plan: this.translatePlan(sub.plan),
        status: this.translateSubscriptionStatus(sub.status),
        amount: `$${Number(sub.amount).toLocaleString('es-AR')}`,
        createdAt: new Date(sub.createdAt).toLocaleDateString('es-AR'),
        nextPaymentDate: sub.nextPaymentDate
          ? new Date(sub.nextPaymentDate).toLocaleDateString('es-AR')
          : '-',
      })),
      summary: [
        { label: 'Total de suscripciones', value: subscriptions.length },
        { label: 'Ingresos mensuales proyectados', value: `$${totalRevenue.toLocaleString('es-AR')} ARS` },
      ],
    };

    await this.pdfReportService.generateReport(res, reportData);
  }

  /**
   * Generar reporte de tickets
   */
  async generateTicketsReport(
    res: Response,
    filters: { status?: string; priority?: string; category?: string },
  ): Promise<void> {
    const query = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.user', 'user');

    if (filters.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters.priority) {
      query.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    if (filters.category) {
      query.andWhere('ticket.category = :category', { category: filters.category });
    }

    const tickets = await query.orderBy('ticket.createdAt', 'DESC').getMany();

    const reportData = {
      title: 'Reporte de Tickets de Soporte',
      subtitle: filters.status ? `Filtrado por estado: ${filters.status}` : undefined,
      columns: [
        { key: 'id', label: 'ID', width: 60 },
        { key: 'user.name', label: 'Usuario', width: 100 },
        { key: 'subject', label: 'Asunto', width: 150 },
        { key: 'category', label: 'Categoría', width: 80 },
        { key: 'priority', label: 'Prioridad', width: 70 },
        { key: 'status', label: 'Estado', width: 80 },
        { key: 'createdAt', label: 'Fecha', width: 80 },
      ],
      data: tickets.map((ticket) => ({
        id: ticket.id.substring(0, 8),
        user: { name: ticket.user?.name || 'N/A' },
        subject: ticket.subject,
        category: this.translateCategory(ticket.category),
        priority: this.translatePriority(ticket.priority),
        status: this.translateTicketStatus(ticket.status),
        createdAt: new Date(ticket.createdAt).toLocaleDateString('es-AR'),
      })),
      summary: [
        { label: 'Total de tickets', value: tickets.length },
        {
          label: 'Por estado',
          value: this.getTicketsByStatusSummary(tickets),
        },
      ],
    };

    await this.pdfReportService.generateReport(res, reportData);
  }

  /**
   * Generar reporte de analíticas
   */
  async generateAnalyticsReport(res: Response): Promise<void> {
    const dashboard = await this.analyticsService.getDashboardMetrics();
    const usersByProvince = await this.analyticsService.getUsersByProvince();

    const reportData = {
      title: 'Reporte de Analíticas del CRM',
      subtitle: `Generado el ${new Date().toLocaleDateString('es-AR')}`,
      columns: [
        { key: 'metric', label: 'Métrica', width: 300 },
        { key: 'value', label: 'Valor', width: 200 },
      ],
      data: [
        { metric: 'Total de Usuarios', value: dashboard.users.total },
        { metric: 'Usuarios Activos', value: dashboard.users.active },
        { metric: 'Usuarios Inactivos', value: dashboard.users.inactive },
        { metric: 'Usuarios Minoristas', value: dashboard.users.byRole.retailers },
        { metric: 'Usuarios Mayoristas', value: dashboard.users.byRole.wholesalers },
        { metric: 'Usuarios Clientes', value: dashboard.users.byRole.clients },
        { metric: 'Nuevos Usuarios Hoy', value: dashboard.users.newToday },
        { metric: 'Nuevos Usuarios (7 días)', value: dashboard.users.new7Days },
        { metric: 'Nuevos Usuarios (30 días)', value: dashboard.users.new30Days },
        { metric: 'Suscripciones Activas', value: dashboard.subscriptions.active },
        { metric: 'Suscripciones Pendientes', value: dashboard.subscriptions.pending },
        { metric: 'Total de Suscripciones', value: dashboard.subscriptions.total },
        {
          metric: 'Usuarios por Provincia (Top 5)',
          value: usersByProvince
            .slice(0, 5)
            .map((p: any) => `${p.province}: ${p.count}`)
            .join(', '),
        },
      ],
      summary: [
        {
          label: 'Estado General',
          value: `${dashboard.subscriptions.active} activas de ${dashboard.subscriptions.total} totales`,
        },
      ],
    };

    await this.pdfReportService.generateReport(res, reportData);
  }

  // Métodos auxiliares para traducir enums
  private translateRole(role: UserRole): string {
    const translations = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.RETAILER]: 'Minorista',
      [UserRole.WHOLESALER]: 'Mayorista',
      [UserRole.CLIENT]: 'Cliente',
    };
    return translations[role] || role;
  }

  private translatePlan(plan: SubscriptionPlan): string {
    const translations = {
      [SubscriptionPlan.RETAILER]: 'Minorista',
      [SubscriptionPlan.WHOLESALER]: 'Mayorista',
    };
    return translations[plan] || plan;
  }

  private translateSubscriptionStatus(status: SubscriptionStatus): string {
    const translations = {
      [SubscriptionStatus.ACTIVE]: 'Activa',
      [SubscriptionStatus.PENDING]: 'Pendiente',
      [SubscriptionStatus.CANCELLED]: 'Cancelada',
      [SubscriptionStatus.EXPIRED]: 'Expirada',
      [SubscriptionStatus.PAUSED]: 'Pausada',
      [SubscriptionStatus.FAILED]: 'Fallida',
    };
    return translations[status] || status;
  }

  private translateTicketStatus(status: TicketStatus): string {
    const translations = {
      [TicketStatus.OPEN]: 'Abierto',
      [TicketStatus.IN_PROGRESS]: 'En Progreso',
      [TicketStatus.RESOLVED]: 'Resuelto',
      [TicketStatus.CLOSED]: 'Cerrado',
    };
    return translations[status] || status;
  }

  private translatePriority(priority: TicketPriority): string {
    const translations = {
      [TicketPriority.LOW]: 'Baja',
      [TicketPriority.MEDIUM]: 'Media',
      [TicketPriority.HIGH]: 'Alta',
    };
    return translations[priority] || priority;
  }

  private translateCategory(category: TicketCategory): string {
    const translations = {
      [TicketCategory.TECHNICAL]: 'Técnico',
      [TicketCategory.BILLING]: 'Facturación',
      [TicketCategory.ACCOUNT]: 'Cuenta',
      [TicketCategory.GENERAL]: 'General',
      [TicketCategory.FEATURE_REQUEST]: 'Solicitud de Función',
    };
    return translations[category] || category;
  }

  private getUsersByRoleSummary(users: User[]): string {
    const counts = {
      admin: 0,
      retailer: 0,
      wholesaler: 0,
      client: 0,
    };

    users.forEach((user) => {
      if (user.role === UserRole.ADMIN) counts.admin++;
      else if (user.role === UserRole.RETAILER) counts.retailer++;
      else if (user.role === UserRole.WHOLESALER) counts.wholesaler++;
      else if (user.role === UserRole.CLIENT) counts.client++;
    });

    return `Admin: ${counts.admin}, Minorista: ${counts.retailer}, Mayorista: ${counts.wholesaler}, Cliente: ${counts.client}`;
  }

  private getTicketsByStatusSummary(tickets: Ticket[]): string {
    const counts = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    tickets.forEach((ticket) => {
      if (ticket.status === TicketStatus.OPEN) counts.open++;
      else if (ticket.status === TicketStatus.IN_PROGRESS) counts.in_progress++;
      else if (ticket.status === TicketStatus.RESOLVED) counts.resolved++;
      else if (ticket.status === TicketStatus.CLOSED) counts.closed++;
    });

    return `Abiertos: ${counts.open}, En progreso: ${counts.in_progress}, Resueltos: ${counts.resolved}, Cerrados: ${counts.closed}`;
  }
}
