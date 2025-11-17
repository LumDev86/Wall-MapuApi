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
import { GeocodingService } from '../../common/services/geocoding.service';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    private geocodingService: GeocodingService,
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
    // Paginación (valores por defecto)
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.shopRepository.createQueryBuilder('shop');

    // ✅ CORREGIDO: Tipar correctamente
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

  async update(id: string, updateShopDto: UpdateShopDto, user: User) {
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