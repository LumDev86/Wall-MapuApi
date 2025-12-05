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

  // ============================================
  // CREATE SHOP — Opción A
  // ============================================
  async create(
    createShopDto: CreateShopDto,
    owner: User,
    files?: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
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

    // GEO OBLIGATORIO
    let latitude: number;
    let longitude: number;
    let formattedAddress: string | null = null;

    try {
      const geo = await this.geocodingService.geocodeAddress(
        createShopDto.address,
        createShopDto.city,
        createShopDto.province,
      );

      latitude = geo.latitude;
      longitude = geo.longitude;
      formattedAddress = geo.formattedAddress;

    } catch (error) {
      throw new BadRequestException(
        'No se pudo obtener la ubicación. Verifica que los datos de dirección sean correctos.',
      );
    }

    // Logo
    let logoUrl: string | undefined = undefined;
    if (files?.logo?.[0]) {
      const upload = await this.cloudinaryService.uploadImage(
        files.logo[0],
        'petshops/logos',
      );
      logoUrl = upload.secure_url;
    }

    // Banner
    let bannerUrl: string | undefined = undefined;
    if (files?.banner?.[0]) {
      const upload = await this.cloudinaryService.uploadImage(
        files.banner[0],
        'petshops/banners',
      );
      bannerUrl = upload.secure_url;
    }

    const shop = this.shopRepository.create({
      ...createShopDto,
      latitude,
      longitude,
      logo: logoUrl,
      banner: bannerUrl,
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
    files?: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
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

    // Logo
    if (files?.logo?.[0]) {
      const upload = await this.cloudinaryService.uploadImage(
        files.logo[0],
        `petshops/logos/${id}`,
      );
      updateShopDto.logo = upload.secure_url;
    }

    // Banner
    if (files?.banner?.[0]) {
      const upload = await this.cloudinaryService.uploadImage(
        files.banner[0],
        `petshops/banners/${id}`,
      );
      updateShopDto.banner = upload.secure_url;
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

    // GEO OBLIGATORIO
    try {
      const geo = await this.geocodingService.geocodeAddress(address, city, province);
      updateShopDto.latitude = geo.latitude;
      updateShopDto.longitude = geo.longitude;
    } catch (error) {
      throw new BadRequestException(
        'No se pudo obtener la nueva ubicación. Verifica los datos ingresados.',
      );
    }

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
      .where('shop.isActive = true');

    // Filtrar por rol
    if (user) {
      if (user.role === UserRole.CLIENT) {
        query.andWhere('shop.type = :type', { type: ShopType.RETAILER });
      } else if (user.role === UserRole.RETAILER) {
        query.andWhere('shop.type = :type', { type: ShopType.WHOLESALER });
      }
    }

    if (type) query.andWhere('shop.type = :type', { type });
    if (status) query.andWhere('shop.status = :status', { status });

    if (product) {
      query.andWhere('product.name ILIKE :product', {
        product: `%${product}%`,
      });
    }

    if (latitude && longitude) {
      query.andWhere(`
        earth_distance(
          ll_to_earth(shop.latitude, shop.longitude),
          ll_to_earth(:lat, :lng)
        ) < :dist
      `, {
        lat: latitude,
        lng: longitude,
        dist: radius * 1000,
      });
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
}
