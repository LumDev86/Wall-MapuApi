import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsService } from './shops.service';
import { ShopsController } from './shops.controller';
import { Shop } from './entities/shop.entity';
import { Review } from './entities/review.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { GeocodingService } from '../../common/services/geocoding.service';
import { Product } from '../products/entities/product.entity';
import { CloudinaryModule } from 'src/common/services/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shop, Review, Product, Subscription]), CloudinaryModule],
  controllers: [ShopsController],
  providers: [ShopsService, GeocodingService],
  exports: [ShopsService],
})
export class ShopsModule {}