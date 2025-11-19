import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop, ShopStatus, ShopType } from './entities/shop.entity';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { FilterShopsDto } from './dtos/filter-shops.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { GeocodingService } from '../../common/services/geocoding.service';
import { CloudinaryService } from '../../common/services/cloudinary.service';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private geocodingService: GeocodingService,
    private cloudinaryService: CloudinaryService,
    private redisService: RedisService,
  ) {}

  async create(createShopDto: CreateShopDto, owner: User) {
    const { latitude, longitude, formattedAddress } =
      await this.geocodingService.geocodeAddress(
        createShopDto.address,
        createShopDto.city,
        createShopDto.province,
      );

    const shop = this.shopRepository.create({
      ...createShopDto,
      latitude,
      longitude,
      owner,
      status: ShopStatus.PENDING_PAYMENT,
    });

    await this.shopRepository.save(shop);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.deleteKeysByPattern('shops:location:*');

    return {
      message:
        'Local registrado exitosamente. Pendiente de pago para activación.',
      shop: this.sanitizeShop(shop),
      geocodedAddress: formattedAddress,
    };
  }

  async findAll(filters: FilterShopsDto, user?: User | null) {
    // 🔍 HU-007: Si hay filtro por producto, usar búsqueda especializada
    if (filters.product) {
      return this.findShopsByProduct(filters, user);
    }

    // 🚀 CHECK CACHE PRIMERO para búsquedas por ubicación
    if (filters.latitude && filters.longitude) {
      const cacheKey = `shops:location:${filters.latitude}:${filters.longitude}:${filters.radius || 10}:${JSON.stringify(filters)}`;
      const cached = await this.redisService.getJSON(cacheKey);
      
      if (cached) {
        return { ...cached, cached: true };
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.shopRepository.createQueryBuilder('shop');

    let appliedFilter: {
      byRole: string | null;
      showingType: string | null;
    } = {
      byRole: null,
      showingType: null,
    };

    if (user) {
      if (user.role === UserRole.CLIENT) {
        query.andWhere('shop.type = :type', { type: ShopType.RETAILER });
        appliedFilter.byRole = 'client';
        appliedFilter.showingType = 'retailer';
      } else if (user.role === UserRole.RETAILER) {
        query.andWhere('shop.type = :type', { type: ShopType.WHOLESALER });
        appliedFilter.byRole = 'retailer';
        appliedFilter.showingType = 'wholesaler';
      }
    }

    if (filters.type) {
      query.andWhere('shop.type = :type', { type: filters.type });
      appliedFilter.showingType = filters.type;
    }

    if (filters.status) {
      query.andWhere('shop.status = :status', { status: filters.status });
    } else {
      query.andWhere('shop.status = :status', { status: ShopStatus.ACTIVE });
    }

    query.andWhere('shop.isActive = :isActive', { isActive: true });

    if (filters.latitude && filters.longitude && filters.radius) {
      const radius = filters.radius || 10;
      query.andWhere(
        `(6371 * acos(
          cos(radians(:lat)) * 
          cos(radians(shop.latitude)) * 
          cos(radians(shop.longitude) - radians(:lng)) + 
          sin(radians(:lat)) * 
          sin(radians(shop.latitude))
        )) <= :radius`,
        {
          lat: filters.latitude,
          lng: filters.longitude,
          radius,
        },
      );
    }

    query.leftJoinAndSelect('shop.owner', 'owner');

    const totalBeforePagination = await query.getCount();

    query.skip(skip).take(limit);

    query.orderBy('shop.createdAt', 'DESC');

    let shops = await query.getMany();

    let totalAfterOpenNowFilter = totalBeforePagination;
    if (filters.openNow) {
      shops = shops.filter((shop) => this.isShopOpenNow(shop));
      totalAfterOpenNowFilter = shops.length;
    }

    const shopsWithStatus = shops.map((shop) => ({
      ...this.sanitizeShop(shop),
      isOpenNow: this.isShopOpenNow(shop),
    }));

    const total = filters.openNow
      ? totalAfterOpenNowFilter
      : totalBeforePagination;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const result = {
      data: shopsWithStatus,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: appliedFilter,
    };

    // 🚀 GUARDAR EN CACHE para búsquedas por ubicación (5 minutos)
    if (filters.latitude && filters.longitude) {
      const cacheKey = `shops:location:${filters.latitude}:${filters.longitude}:${filters.radius || 10}:${JSON.stringify(filters)}`;
      await this.redisService.setJSON(cacheKey, { ...result, cached: true }, 300);
    }

    return result;
  }

  /**
   * 🔍 HU-007: Buscar shops que tienen un producto específico
   */
  private async findShopsByProduct(filters: FilterShopsDto, user?: User | null) {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = `shops:product:${filters.product}:${JSON.stringify(filters)}`;
    const cached = await this.redisService.getJSON(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const productQuery = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('shop.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category');

    productQuery.andWhere('LOWER(product.name) LIKE LOWER(:productName)', {
      productName: `%${filters.product}%`,
    });

    productQuery.andWhere('product.isActive = :isActive', { isActive: true });
    productQuery.andWhere('product.stock > 0');

    productQuery.andWhere('shop.isActive = :shopActive', { shopActive: true });
    productQuery.andWhere('shop.status = :shopStatus', {
      shopStatus: ShopStatus.ACTIVE,
    });

    let appliedFilter: {
      byRole: string | null;
      showingType: string | null;
      searchedProduct: string;
    } = {
      byRole: null,
      showingType: null,
      searchedProduct: filters.product || '',
    };

    if (user) {
      if (user.role === UserRole.CLIENT) {
        productQuery.andWhere('shop.type = :type', { type: ShopType.RETAILER });
        appliedFilter.byRole = 'client';
        appliedFilter.showingType = 'retailer';
      } else if (user.role === UserRole.RETAILER) {
        productQuery.andWhere('shop.type = :type', {
          type: ShopType.WHOLESALER,
        });
        appliedFilter.byRole = 'retailer';
        appliedFilter.showingType = 'wholesaler';
      }
    }

    if (filters.type) {
      productQuery.andWhere('shop.type = :type', { type: filters.type });
      appliedFilter.showingType = filters.type;
    }

    if (filters.latitude && filters.longitude && filters.radius) {
      const radius = filters.radius || 10;
      productQuery.andWhere(
        `(6371 * acos(
          cos(radians(:lat)) * 
          cos(radians(shop.latitude)) * 
          cos(radians(shop.longitude) - radians(:lng)) + 
          sin(radians(:lat)) * 
          sin(radians(shop.latitude))
        )) <= :radius`,
        {
          lat: filters.latitude,
          lng: filters.longitude,
          radius,
        },
      );
    }

    const allProducts = await productQuery.getMany();

    const shopProductsMap = new Map<string, any>();

    allProducts.forEach((product) => {
      const shopId = product.shop.id;

      if (!shopProductsMap.has(shopId)) {
        shopProductsMap.set(shopId, {
          shop: product.shop,
          matchedProducts: [],
        });
      }

      let displayPrice = product.priceRetail;

      if (user?.role === UserRole.RETAILER && product.priceWholesale) {
        displayPrice = product.priceWholesale;
      }

      shopProductsMap.get(shopId).matchedProducts.push({
        id: product.id,
        name: product.name,
        description: product.description,
        price: displayPrice,
        priceLabel:
          user?.role === UserRole.RETAILER ? 'Precio Mayorista' : 'Precio',
        stock: product.stock,
        images: product.images,
        brand: product.brand,
        category: product.category,
      });
    });

    let shopsWithProducts = Array.from(shopProductsMap.values());

    if (filters.openNow) {
      shopsWithProducts = shopsWithProducts.filter((item) =>
        this.isShopOpenNow(item.shop),
      );
    }

    const total = shopsWithProducts.length;

    const paginatedShops = shopsWithProducts.slice(skip, skip + limit);

    const result = paginatedShops.map((item) => ({
      shop: {
        ...this.sanitizeShop(item.shop),
        isOpenNow: this.isShopOpenNow(item.shop),
      },
      matchedProducts: item.matchedProducts,
    }));

    const totalPages = Math.ceil(total / limit);

    const finalResult = {
      data: result,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      filters: appliedFilter,
    };

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, { ...finalResult, cached: true }, 300);

    return finalResult;
  }

  async findOne(id: string) {
    // 🚀 CHECK CACHE PRIMERO
    const cacheKey = `shop:${id}`;
    const cached = await this.redisService.getJSON(cacheKey);
    
    if (cached) {
      return cached;
    }

    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    const result = {
      ...this.sanitizeShop(shop),
      isOpenNow: this.isShopOpenNow(shop),
    };

    // 🚀 GUARDAR EN CACHE (5 minutos)
    await this.redisService.setJSON(cacheKey, result, 300);

    return result;
  }

  async update(
    id: string,
    updateShopDto: UpdateShopDto,
    user: User,
    banner?: Express.Multer.File,
  ) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException('No tienes permiso para editar este local');
    }

    if (banner) {
      if (shop.banner) {
        const publicId = this.cloudinaryService.extractPublicId(shop.banner);
        await this.cloudinaryService.deleteImage(publicId);
      }

      const uploadResult = await this.cloudinaryService.uploadImage(
        banner,
        `petshops/banners/${id}`,
      );

      updateShopDto.banner = uploadResult.secure_url;
    }

    if (
      updateShopDto.address ||
      updateShopDto.city ||
      updateShopDto.province
    ) {
      const { latitude, longitude } =
        await this.geocodingService.geocodeAddress(
          updateShopDto.address || shop.address,
          updateShopDto.city || shop.city,
          updateShopDto.province || shop.province,
        );

      Object.assign(shop, { ...updateShopDto, latitude, longitude });
    } else {
      Object.assign(shop, updateShopDto);
    }

    await this.shopRepository.save(shop);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del(`shop:${id}`);
    await this.redisService.deleteKeysByPattern('shops:location:*');
    await this.redisService.deleteKeysByPattern('shops:product:*');

    return {
      message: 'Local actualizado exitosamente',
      shop: this.sanitizeShop(shop),
    };
  }

  async remove(id: string, user: User) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    if (shop.owner.id !== user.id) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este local',
      );
    }

    shop.isActive = false;
    await this.shopRepository.save(shop);

    // 🗑️ INVALIDAR CACHE
    await this.redisService.del(`shop:${id}`);
    await this.redisService.deleteKeysByPattern('shops:location:*');
    await this.redisService.deleteKeysByPattern('shops:product:*');

    return {
      message: 'Local eliminado exitosamente',
    };
  }

  private isShopOpenNow(shop: Shop): boolean {
    if (!shop.schedule) {
      return false;
    }

    const now = new Date();
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);

    const todaySchedule = shop.schedule[currentDay];

    if (!todaySchedule || !todaySchedule.open || !todaySchedule.close) {
      return false;
    }

    return (
      currentTime >= todaySchedule.open && currentTime <= todaySchedule.close
    );
  }

  private sanitizeShop(shop: Shop) {
    if (shop.owner) {
      const {
        password,
        passwordResetToken,
        emailVerificationToken,
        ...owner
      } = shop.owner;
      return { ...shop, owner };
    }
    return shop;
  }
}