import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { ShopsModule } from './modules/shops/shops.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { ReportsModule } from './modules/reports/reports.module';
import redisConfig from './config/redis.config';
import { RedisModule } from './common/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig, redisConfig],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get('database');
        if (!config) {
          throw new Error('Database configuration not found');
        }
        return config;
      },
      inject: [ConfigService],
    }),

    ScheduleModule.forRoot(),
    RedisModule,
    AuthModule,
    UsersModule,
    ShopsModule,
    ProductsModule,
    CategoriesModule,
    SubscriptionsModule,
    AdminModule,
    CartModule,
    OrdersModule,
    AnalyticsModule,
    TicketsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
