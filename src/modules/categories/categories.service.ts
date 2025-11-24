import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryMultipartDto } from './dtos/create-category-multipart.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private readonly cloudinaryService: CloudinaryService,
    private redisService: RedisService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryMultipartDto,
    icon?: Express.Multer.File,
  ) {
    const { parentId, ...data } = createCategoryDto;

    if (parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundException('Categoría padre no encontrada');
      }

      if (parent.parentId) {
        throw new BadRequestException(
          'No se pueden crear subcategorías de tercer nivel',
        );
      }
    }

    let iconUrl: string | null = null;

    if (icon) {
      const upload = await this.cloudinaryService.uploadImage(icon, 'categories');
      iconUrl = upload.secure_url;
    }

    const category = this.categoryRepository.create({
      ...data,
      parentId,
      icon: iconUrl || null,
    });

    await this.categoryRepository.save(category);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del('categories:all:active');

    return {
      message: 'Categoría creada exitosamente',
      category,
    };
  }

  async findAll() {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = 'categories:all:active';
    const cached = await this.redisService.getJSON<{total: number, categories: Category[]}>(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    const categories = await this.categoryRepository.find({
      where: { isActive: true, parentId: IsNull() },
      relations: ['subcategories'],
      order: { order: 'ASC', name: 'ASC' },
    });

    const result = {
      total: categories.length,
      categories,
    };

    // 🚀 GUARDAR EN CACHE (10 minutos)
    await this.redisService.setJSON(cacheKey, result, 600);

    return result;
  }

  async findOne(id: string) {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = `category:${id}`;
    const cached = await this.redisService.getJSON<Category>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories', 'parent'],
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, category, 300);

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    icon?: Express.Multer.File,
  ) {
    // Usar el método findOne para obtener la categoría (con cache)
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories', 'parent'],
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    const { parentId, ...data } = updateCategoryDto;

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException(
          'Una categoría no puede ser su propia padre',
        );
      }

      if (parentId) {
        const parent = await this.categoryRepository.findOne({
          where: { id: parentId },
        });

        if (!parent) {
          throw new NotFoundException('Categoría padre no encontrada');
        }

        if (parent.parentId) {
          throw new BadRequestException(
            'No se pueden crear subcategorías de tercer nivel',
          );
        }
      }

      category.parentId = parentId;
    }

    if (icon) {
      const upload = await this.cloudinaryService.uploadImage(icon, 'categories');
      category.icon = upload.secure_url;
    }

    // Actualizar solo las propiedades que existen en data
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        category[key] = data[key];
      }
    });

    await this.categoryRepository.save(category);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del('categories:all:active');
    await this.redisService.del(`category:${id}`);

    return {
      message: 'Categoría actualizada exitosamente',
      category,
    };
  }

  async remove(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['subcategories'],
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category.subcategories && category.subcategories.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría con subcategorías',
      );
    }

    category.isActive = false;
    await this.categoryRepository.save(category);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del('categories:all:active');
    await this.redisService.del(`category:${id}`);

    return {
      message: 'Categoría eliminada exitosamente',
    };
  }
}