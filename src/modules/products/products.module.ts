import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Category } from '../categories/entities/category.entity';
import { CloudinaryModule } from 'src/common/services/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Shop, Category]), CloudinaryModule],
  controllers: [ProductsController],
  providers: [ProductsService,],
  exports: [ProductsService],
})
export class ProductsModule {}
