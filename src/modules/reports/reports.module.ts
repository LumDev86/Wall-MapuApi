import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PdfReportService } from '../../common/services/pdf-report.service';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Subscription, Ticket]),
    AnalyticsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, PdfReportService],
  exports: [ReportsService],
})
export class ReportsModule {}
