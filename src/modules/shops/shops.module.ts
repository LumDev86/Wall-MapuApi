import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { Shop } from './entities/shop.entity';
import { Review } from './entities/review.entity';
import { GeocodingService } from '../../common/services/geocoding.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Review])],
  controllers: [ShopsController],
  providers: [ShopsService, GeocodingService], // ← GeocodingService debe estar aquí
  exports: [ShopsService],
})
export class ShopsModule {}