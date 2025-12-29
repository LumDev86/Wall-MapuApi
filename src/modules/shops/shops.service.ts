// ============================================
// shops.service.ts (CORREGIDO + MÉTODOS COMPLETOS)
// ============================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop, ShopStatus, ShopType } from './entities/shop.entity';
import { CreateShopDto } from './dtos/create-shop.dto';
  import { UpdateShopDto } from './dtos/update-shop.dto';
import { FilterShopsDto } from './dtos/filter-shops.dto';
import { ShopResponseDto } from './dtos/shop-response.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private redisService: RedisService,
  ) {}

  // ============================================
  // CREATE SHOP — Opción A
  // ============================================
  async create(
    createShopDto: CreateShopDto,
    owner: User,
  ) {
    // Validación horarios
    if (createShopDto.schedule) {
      this.validateSchedule(createShopDto.schedule);
    }

    // Validar dirección completa
    if (!createShopDto.address || !createShopDto.city || !createShopDto.province) {
      throw new BadRequestException(
        'Debes proporcionar dirección, ciudad y provincia para registrar el local.',
      );
    }

    // Coordenadas REQUERIDAS desde el frontend (LocationPicker)
    // Ya no se hace geocoding en el backend
    const latitude = createShopDto.latitude;
    const longitude = createShopDto.longitude;
    const formattedAddress = `${createShopDto.address}, ${createShopDto.city}, ${createShopDto.province}`;

    const shop = this.shopRepository.create({
      ...createShopDto,
      latitude,
      longitude,
      owner: { id: owner.id },
      status: ShopStatus.ACTIVE,
    });

    const savedShop = await this.shopRepository.save(shop);

    await this.redisService.deleteKeysByPattern('shops:location:*');

    // Cargar relaciones para el DTO
    const shopWithRelations = await this.shopRepository.findOne({
      where: { id: savedShop.id },
      relations: ['owner'],
    });

    if (!shopWithRelations) {
      throw new NotFoundException('Error al cargar el local creado');
    }

    return {
      message: 'Local registrado exitosamente.',
      shop: ShopResponseDto.fromEntity(shopWithRelations, true, false),
      geocodedAddress: formattedAddress,
    };
  }


  // ============================================
  // UPDATE SHOP
  // ============================================
  async update(
    id: string,
    updateShopDto: UpdateShopDto,
    user: User,
  ) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) throw new NotFoundException('Local no encontrado');
    if (shop.owner.id !== user.id)
      throw new ForbiddenException('No tienes permiso para editar este local');

    // Validación horarios
    if (updateShopDto.schedule) {
      this.validateSchedule(updateShopDto.schedule);
    }

    // Dirección final
    const address = updateShopDto.address ?? shop.address;
    const city = updateShopDto.city ?? shop.city;
    const province = updateShopDto.province ?? shop.province;

    // Validación de dirección completa
    if (!address || !city || !province) {
      throw new BadRequestException(
        'Debes proporcionar dirección, ciudad y provincia para actualizar el local.',
      );
    }

    // Si se enviaron coordenadas desde el frontend, usarlas
    // Ya no se hace geocoding en el backend - las coordenadas vienen del frontend (LocationPicker)

    Object.assign(shop, updateShopDto);
    const savedShop = await this.shopRepository.save(shop);

    await this.redisService.del(`shop:${id}`);
    await this.redisService.deleteKeysByPattern('shops:location:*');
    await this.redisService.deleteKeysByPattern('shops:product:*');

    // Cargar relaciones para el DTO
    const shopWithRelations = await this.shopRepository.findOne({
      where: { id: savedShop.id },
      relations: ['owner'],
    });

    if (!shopWithRelations) {
      throw new NotFoundException('Error al cargar el local actualizado');
    }

    return {
      message: 'Local actualizado exitosamente',
      shop: ShopResponseDto.fromEntity(shopWithRelations, true, false),
    };
  }


  // ============================================
  // GET — findMyShop (PÚBLICO)
  // ============================================
  async findMyShop(user: User) {
    const shop = await this.shopRepository.findOne({
      where: { owner: { id: user.id } },
      relations: ['owner', 'products'],
    });

    if (!shop) {
      throw new NotFoundException('El usuario no tiene un local registrado');
    }

    return ShopResponseDto.fromEntity(shop, true, true);
  }

  // ============================================
  // GET — findAll (filtros + paginación)
  // ============================================
  async findAll(filters: FilterShopsDto, user: User | null) {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      latitude,
      longitude,
      radius = 10,
      openNow,
      product,
    } = filters;

    const query = this.shopRepository
      .createQueryBuilder('shop')
      .leftJoinAndSelect('shop.products', 'product')
      // 🧪 MODO TESTING: Comentado temporalmente para mostrar TODAS las tiendas
      // .leftJoin('shop.owner', 'owner')
      // .leftJoin('owner.subscriptions', 'subscription', 'subscription.shopId = shop.id')
      .where('shop.isActive = true');
      // ⭐ FILTRO PRINCIPAL: Solo mostrar tiendas con suscripción ACTIVA (Comentado para testing)
      // .andWhere('subscription.status = :subscriptionStatus', { subscriptionStatus: 'active' })
      // .andWhere('shop.status = :activeShopStatus', { activeShopStatus: ShopStatus.ACTIVE });

    // Filtrar por rol
    if (user) {
      if (user.role === UserRole.CLIENT) {
        query.andWhere('shop.type = :userRoleType', { userRoleType: ShopType.RETAILER });
      } else if (user.role === UserRole.RETAILER) {
        query.andWhere('shop.type = :userRoleType', { userRoleType: ShopType.WHOLESALER });
      }
    }

    // Filtros opcionales
    if (type) query.andWhere('shop.type = :filterType', { filterType: type });
    if (status) query.andWhere('shop.status = :filterStatus', { filterStatus: status });

    if (product) {
      query.andWhere('product.name ILIKE :product', {
        product: `%${product}%`,
      });
    }

    // Las coordenadas de ubicación se ignoran en el backend
    // El filtrado y ordenamiento por distancia se hace en el frontend
    // Solo asegurarse de devolver tiendas con coordenadas válidas
    if (latitude && longitude) {
      query.andWhere('shop.latitude IS NOT NULL')
           .andWhere('shop.longitude IS NOT NULL');
    }

    if (openNow) {
      const weekday = new Date()
        .toLocaleString('en-US', { weekday: 'long' })
        .toLowerCase();

      query.andWhere(`
        shop.schedule->:day->>'open' IS NOT NULL 
        AND shop.schedule->:day->>'close' IS NOT NULL
      `, { day: weekday });
    }

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((shop) => ShopResponseDto.fromEntity(shop, false, false)),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  // ============================================
  // GET — findOne (detalle + productos paginados)
  // ============================================
  async findOne(id: string, page = 1, limit = 10) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    const [products, total] = await this.productRepository.findAndCount({
      where: { shop: { id } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      shop: ShopResponseDto.fromEntity(shop, true, false),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        priceRetail: p.priceRetail,
        priceWholesale: p.priceWholesale,
        stock: p.stock,
        images: p.images || [],
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
  }

  // ============================================
  // DELETE — remove
  // ============================================
  async remove(id: string, user: User) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) throw new NotFoundException('Local no encontrado');
    if (shop.owner.id !== user.id)
      throw new ForbiddenException('No puedes eliminar este local');

    await this.shopRepository.remove(shop);
    await this.redisService.del(`shop:${id}`);
    await this.redisService.deleteKeysByPattern('shops:*');

    return { message: 'Local eliminado exitosamente' };
  }

  // ============================================
  // UTILIDADES
  // ============================================
  private validateSchedule(schedule: any): void {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    Object.entries(schedule).forEach(([day, times]: [string, any]) => {
      if (times?.open && !timeRegex.test(times.open)) {
        throw new BadRequestException(
          `Formato de hora inválido en ${day}.open. Use HH:mm`,
        );
      }
      if (times?.close && !timeRegex.test(times.close)) {
        throw new BadRequestException(
          `Formato de hora inválido en ${day}.close. Use HH:mm`,
        );
      }
      if (times?.open >= times?.close) {
        throw new BadRequestException(
          `En ${day}, la hora de apertura debe ser menor a la de cierre`,
        );
      }
    });
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

  // ============================================
  // UPDATE PROMOTIONAL BANNER
  // ============================================
  async updatePromotionalBanner(
    id: string,
    updatePromotionalBannerDto: any,
    user: User,
  ) {
    const shop = await this.shopRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!shop) throw new NotFoundException('Local no encontrado');
    if (shop.owner.id !== user.id)
      throw new ForbiddenException('No tienes permiso para editar este local');

    // Verificar que la tienda tenga una suscripción activa
    const activeSubscription = await this.shopRepository
      .createQueryBuilder('shop')
      .leftJoinAndSelect('shop.owner', 'owner')
      .leftJoin('owner.subscriptions', 'subscription')
      .where('shop.id = :shopId', { shopId: id })
      .andWhere('subscription.shopId = :shopId', { shopId: id })
      .andWhere('subscription.status = :status', { status: 'active' })
      .getOne();

    if (!activeSubscription) {
      throw new ForbiddenException(
        'Necesitas una suscripción activa para tener banners promocionales',
      );
    }

    // Actualizar banner promocional
    shop.promotionalBanner = {
      title: updatePromotionalBannerDto.title,
      subtitle: updatePromotionalBannerDto.subtitle,
      imageUrl: updatePromotionalBannerDto.imageUrl,
      isActive: updatePromotionalBannerDto.isActive ?? true,
      createdAt: new Date().toISOString(),
    };

    await this.shopRepository.save(shop);

    return {
      message: 'Banner promocional actualizado exitosamente',
      shop: this.sanitizeShop(shop),
    };
  }

  // ============================================
  // INCREMENT CLICK COUNT
  // ============================================
  async incrementClickCount(id: string) {
    const shop = await this.shopRepository.findOne({
      where: { id, isActive: true },
    });

    if (!shop) {
      throw new NotFoundException('Local no encontrado');
    }

    // Incrementar el contador de clicks
    shop.clickCount = (shop.clickCount || 0) + 1;
    await this.shopRepository.save(shop);

    // Invalidar caché si es necesario
    await this.redisService.del(`shop:${id}`);

    return {
      message: 'Click registrado exitosamente',
      clickCount: shop.clickCount,
    };
  }

}
