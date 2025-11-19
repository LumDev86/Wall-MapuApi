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

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private geocodingService: GeocodingService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createShopDto: CreateShopDto, owner: User) {
    // 🗺️ Geocodificar automáticamente la dirección
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

    // Paginación (valores por defecto)
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

    // HU-002: Filtrar por tipo según rol del usuario
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

    // Filtro manual por tipo
    if (filters.type) {
      query.andWhere('shop.type = :type', { type: filters.type });
      appliedFilter.showingType = filters.type;
    }

    // Filtro por estado
    if (filters.status) {
      query.andWhere('shop.status = :status', { status: filters.status });
    } else {
      query.andWhere('shop.status = :status', { status: ShopStatus.ACTIVE });
    }

    query.andWhere('shop.isActive = :isActive', { isActive: true });

    // Filtro por ubicación (radio)
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

    // Obtener total ANTES de paginar (para metadata)
    const totalBeforePagination = await query.getCount();

    // Aplicar paginación
    query.skip(skip).take(limit);

    // Ordenar por fecha de creación (más recientes primero)
    query.orderBy('shop.createdAt', 'DESC');

    let shops = await query.getMany();

    // HU-003: Filtrar locales abiertos ahora
    let totalAfterOpenNowFilter = totalBeforePagination;
    if (filters.openNow) {
      shops = shops.filter((shop) => this.isShopOpenNow(shop));
      totalAfterOpenNowFilter = shops.length;
    }

    const shopsWithStatus = shops.map((shop) => ({
      ...this.sanitizeShop(shop),
      isOpenNow: this.isShopOpenNow(shop),
    }));

    // Calcular metadata de paginación
    const total = filters.openNow
      ? totalAfterOpenNowFilter
      : totalBeforePagination;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
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
  }

  /**
   * 🔍 HU-007: Buscar shops que tienen un producto específico
   */
  private async findShopsByProduct(filters: FilterShopsDto, user?: User | null) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Query builder para productos
    const productQuery = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.shop', 'shop')
      .leftJoinAndSelect('shop.owner', 'owner')
      .leftJoinAndSelect('product.category', 'category');

    // Filtrar por nombre de producto (búsqueda parcial, case-insensitive)
    productQuery.andWhere('LOWER(product.name) LIKE LOWER(:productName)', {
      productName: `%${filters.product}%`,
    });

    // Solo productos activos y con stock
    productQuery.andWhere('product.isActive = :isActive', { isActive: true });
    productQuery.andWhere('product.stock > 0');

    // Solo shops activos
    productQuery.andWhere('shop.isActive = :shopActive', { shopActive: true });
    productQuery.andWhere('shop.status = :shopStatus', {
      shopStatus: ShopStatus.ACTIVE,
    });

    // HU-002: Filtrar por tipo según rol del usuario
    let appliedFilter: {
      byRole: string | null;
      showingType: string | null;
      searchedProduct: string;
    } = {
      byRole: null,
      showingType: null,
      searchedProduct: filters.product || '', // ✅ Aseguramos que nunca sea undefined
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

    // Filtro manual por tipo
    if (filters.type) {
      productQuery.andWhere('shop.type = :type', { type: filters.type });
      appliedFilter.showingType = filters.type;
    }

    // Filtro por ubicación (radio)
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

    // Obtener productos con sus shops
    const allProducts = await productQuery.getMany();

    // Agrupar productos por shop
    const shopProductsMap = new Map<string, any>();

    allProducts.forEach((product) => {
      const shopId = product.shop.id;

      if (!shopProductsMap.has(shopId)) {
        shopProductsMap.set(shopId, {
          shop: product.shop,
          matchedProducts: [],
        });
      }

      // Determinar qué precio mostrar según el rol
      let displayPrice = product.priceRetail; // Por defecto minorista

      if (user?.role === UserRole.RETAILER && product.priceWholesale) {
        displayPrice = product.priceWholesale;
      }

      // Agregar producto con precio según rol
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

    // Convertir Map a array
    let shopsWithProducts = Array.from(shopProductsMap.values());

    // HU-003: Filtrar locales abiertos ahora
    if (filters.openNow) {
      shopsWithProducts = shopsWithProducts.filter((item) =>
        this.isShopOpenNow(item.shop),
      );
    }

    // Total de shops encontrados
    const total = shopsWithProducts.length;

    // Paginación manual
    const paginatedShops = shopsWithProducts.slice(skip, skip + limit);

    // Agregar isOpenNow y sanitizar
    const result = paginatedShops.map((item) => ({
      shop: {
        ...this.sanitizeShop(item.shop),
        isOpenNow: this.isShopOpenNow(item.shop),
      },
      matchedProducts: item.matchedProducts,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
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
  }

  async findOne(id: string) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    return {
      ...this.sanitizeShop(shop),
      isOpenNow: this.isShopOpenNow(shop),
    };
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

    // 🖼️ HU-009: Subir nuevo banner si se proporciona
    if (banner) {
      // Eliminar banner anterior de Cloudinary si existe
      if (shop.banner) {
        const publicId = this.cloudinaryService.extractPublicId(shop.banner);
        await this.cloudinaryService.deleteImage(publicId);
      }

      // Subir nuevo banner
      const uploadResult = await this.cloudinaryService.uploadImage(
        banner,
        `petshops/banners/${id}`,
      );

      updateShopDto.banner = uploadResult.secure_url;
    }

    // Si cambió la dirección, recalcular coordenadas
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