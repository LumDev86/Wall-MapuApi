import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
