import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { Shop } from './entities/shop.entity';
import { Review } from '../reviews/entities/review.entity';
import { GeocodingService } from '../../common/services/geocoding.service';
import { Product } from '../products/entities/product.entity';
import { CloudinaryModule } from 'src/common/services/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Review, Product]), CloudinaryModule],
  controllers: [ShopsController],
  providers: [ShopsService, GeocodingService],
  exports: [ShopsService],
})
export class ShopsModule {}
