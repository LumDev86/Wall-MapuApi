import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { FilterProductsDto } from './dtos/filter-products.dto';
import { User } from '../users/entities/user.entity';
import { Shop } from '../shops/entities/shop.entity';
import { Category } from '../categories/entities/category.entity';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private cloudinaryService: CloudinaryService,
    private redisService: RedisService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    shopId: string,
    user: User,
    images?: Express.Multer.File[],
  ) {
    const shop = await this.shopRepository.findOne({
      where: { id: shopId },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para agregar productos a este local');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    let imageUrls: string[] = [];
    if (images && images.length > 0) {
      const uploadResults = await this.cloudinaryService.uploadMultipleImages(
        images,
        `petshops/products/${shopId}`,
      );
      imageUrls = uploadResults.map((result) => result.secure_url);
    }

    const product = this.productRepository.create({
      ...createProductDto,
      shopId,
      images: imageUrls,
    });

    await this.productRepository.save(product);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.deleteKeysByPattern('products:search:*');
    await this.redisService.deleteKeysByPattern(`products:shop:${shopId}:*`);

    return {
      message: 'Producto creado exitosamente',
      product,
    };
  }

  async findAll(filters: FilterProductsDto) {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = `products:all:${JSON.stringify(filters)}`;
    const cached = await this.redisService.getJSON(cacheKey);

    if (cached) {
      return { ...cached, cached: true };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.productRepository.createQueryBuilder('product');

    query.andWhere('product.isActive = :isActive', { isActive: true });

    if (filters.search) {
      query.andWhere('LOWER(product.name) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.categoryId) {
      query.andWhere('product.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.brand) {
      query.andWhere('LOWER(product.brand) = LOWER(:brand)', {
        brand: filters.brand,
      });
    }

    if (filters.inStock) {
      query.andWhere('product.stock > 0');
    }

    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
      query.andWhere('product.priceRetail BETWEEN :minPrice AND :maxPrice', {
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
      });
    } else if (filters.minPrice !== undefined) {
      query.andWhere('product.priceRetail >= :minPrice', {
        minPrice: filters.minPrice,
      });
    } else if (filters.maxPrice !== undefined) {
      query.andWhere('product.priceRetail <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    query.leftJoinAndSelect('product.shop', 'shop');
    query.leftJoinAndSelect('product.category', 'category');

    const total = await query.getCount();

    query.skip(skip).take(limit);

    query.orderBy('product.createdAt', 'DESC');

    const products = await query.getMany();

    const totalPages = Math.ceil(total / limit);

    const result = {
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, { ...result, cached: true }, 300);

    return result;
  }

  async findByShop(shopId: string, filters: FilterProductsDto) {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = `products:shop:${shopId}:${JSON.stringify(filters)}`;
    const cached = await this.redisService.getJSON(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    const shop = await this.shopRepository.findOne({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.productRepository.createQueryBuilder('product');

    query.andWhere('product.shopId = :shopId', { shopId });
    query.andWhere('product.isActive = :isActive', { isActive: true });

    if (filters.inStock) {
      query.andWhere('product.stock > 0');
    }

    if (filters.categoryId) {
      query.andWhere('product.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.search) {
      query.andWhere('LOWER(product.name) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    query.leftJoinAndSelect('product.category', 'category');

    const total = await query.getCount();

    query.skip(skip).take(limit);
    query.orderBy('product.createdAt', 'DESC');

    const products = await query.getMany();

    const totalPages = Math.ceil(total / limit);

    const result = {
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, { ...result, cached: true }, 300);

    return result;
  }

  async findOne(id: string) {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = `product:${id}`;
    const cached = await this.redisService.getJSON(cacheKey);
    
    if (cached) {
      return cached;
    }

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['shop', 'category'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, product, 300);

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
    user: User,
    images?: Express.Multer.File[],
  ) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['shop', 'shop.owner'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para editar este producto');
    }

    if (images && images.length > 0) {
      if (product.images && product.images.length > 0) {
        const publicIds = product.images.map((url) =>
          this.cloudinaryService.extractPublicId(url),
        );
        await this.cloudinaryService.deleteMultipleImages(publicIds);
      }

      const uploadResults = await this.cloudinaryService.uploadMultipleImages(
        images,
        `petshops/products/${product.shopId}`,
      );
      product.images = uploadResults.map((result) => result.secure_url);
    }

    if (updateProductDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateProductDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
    }

    Object.assign(product, updateProductDto);
    await this.productRepository.save(product);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del(`product:${id}`);
    await this.redisService.deleteKeysByPattern('products:search:*');
    await this.redisService.deleteKeysByPattern(`products:shop:${product.shopId}:*`);

    return {
      message: 'Producto actualizado exitosamente',
      product,
    };
  }

  async remove(id: string, user: User) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['shop', 'shop.owner'],
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para eliminar este producto');
    }

    if (product.images && product.images.length > 0) {
      const publicIds = product.images.map((url) =>
        this.cloudinaryService.extractPublicId(url),
      );
      await this.cloudinaryService.deleteMultipleImages(publicIds);
    }

    product.isActive = false;
    await this.productRepository.save(product);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del(`product:${id}`);
    await this.redisService.deleteKeysByPattern('products:search:*');
    await this.redisService.deleteKeysByPattern(`products:shop:${product.shopId}:*`);

    return {
      message: 'Producto eliminado exitosamente',
    };
  }
}