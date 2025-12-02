import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BannersController } from './banners.controller';
import { BannersService } from './services/banners.service';
import { Banner } from './entities/banner.entity';
import { MercadoPagoService } from '../subscriptions/services/mercadopago.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([Banner]), ConfigModule],
  controllers: [BannersController],
  providers: [BannersService, MercadoPagoService, CloudinaryService],
  exports: [BannersService],
})
export class BannersModule {}
