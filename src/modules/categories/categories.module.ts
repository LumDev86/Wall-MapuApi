import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { CloudinaryModule } from 'src/common/services/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category]), CloudinaryModule // ← IMPORTANTE: Debe estar aquí
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService,],
  exports: [CategoriesService, TypeOrmModule], // ← Exportar también TypeOrmModule
})
export class CategoriesModule {}