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
import { CategoryResponseDto } from './dtos/category-response.dto';
import { RedisService } from '../../common/redis/redis.service';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private redisService: RedisService,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(
    createCategoryDto: CreateCategoryMultipartDto,
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

    const category = this.categoryRepository.create({
      ...data,
      parentId,
    });

    const savedCategory = await this.categoryRepository.save(category);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del('categories:all:active');

    // Cargar relaciones para el DTO
    const categoryWithRelations = await this.categoryRepository.findOne({
      where: { id: savedCategory.id },
      relations: ['parent', 'subcategories'],
    });

    if (!categoryWithRelations) {
      throw new NotFoundException('Error al cargar la categoría creada');
    }

    return {
      message: 'Categoría creada exitosamente',
      category: CategoryResponseDto.fromEntity(categoryWithRelations, true),
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
      categories: categories.map(cat => CategoryResponseDto.fromEntity(cat, true)),
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

    const result = CategoryResponseDto.fromEntity(category, true);

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, result, 300);

    return result;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
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

    // Actualizar solo las propiedades que existen en data
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        category[key] = data[key];
      }
    });

    const savedCategory = await this.categoryRepository.save(category);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del('categories:all:active');
    await this.redisService.del(`category:${id}`);

    // Cargar relaciones para el DTO
    const categoryWithRelations = await this.categoryRepository.findOne({
      where: { id: savedCategory.id },
      relations: ['parent', 'subcategories'],
    });

    if (!categoryWithRelations) {
      throw new NotFoundException('Error al cargar la categoría actualizada');
    }

    return {
      message: 'Categoría actualizada exitosamente',
      category: CategoryResponseDto.fromEntity(categoryWithRelations, true),
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
  
  async findProductsByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const offset = (page - 1) * limit;

    const cacheKey = `category:${categoryId}:products:page:${page}:limit:${limit}`;

    // 🔥 1. Intentar traer desde cache
    const cached = await this.redisService.getJSON(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 🔥 2. Validar categoría
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');

    // 🔥 3. Traer productos paginados desde la base
    const [products, total] = await this.productRepository.findAndCount({
      where: { categoryId },
      relations: ['shop', 'category'],
      skip: offset,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const totalPages = Math.ceil(total / limit);

    const result = {
      data: products.map((product) => ({
        id: product.id,
        name: product.name,
        priceRetail: product.priceRetail,
        priceWholesale: product.priceWholesale,
        stock: product.stock,
        images: product.images || [],
        shop: product.shop ? {
          id: product.shop.id,
          name: product.shop.name,
          type: product.shop.type,
        } : undefined,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // 🔥 4. Guardar en cache por 60 segundos
    await this.redisService.setJSON(cacheKey, result, 60);

    return result;
  }


}