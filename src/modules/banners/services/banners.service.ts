import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Banner, BannerStatus } from '../entities/banner.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { CreateBannerDto, UpdateBannerDto, FilterBannersDto } from '../dtos';
import { MercadoPagoService } from '../../subscriptions/services/mercadopago.service';
import { CloudinaryService } from '../../../common/services/cloudinary.service';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);
  private readonly BANNER_PRICE = 1500; // ARS
  private readonly MAX_ACTIVE_BANNERS = 3;
  private readonly MAX_PAYMENT_ATTEMPTS = 5;

  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
    private mercadoPagoService: MercadoPagoService,
    private cloudinaryService: CloudinaryService,
    private configService: ConfigService,
  ) {}

  /**
   * Crear un banner (con pago)
   */
  async create(
    createBannerDto: CreateBannerDto,
    user: User,
    imageFile?: Express.Multer.File,
  ) {
    // Validar límite de banners activos
    await this.validateActiveBannersLimit(user.id);

    let imageUrl = createBannerDto.imageUrl;

    // Si se sube una imagen desde el equipo
    if (imageFile) {
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(
          imageFile,
          'petshops/banners',
        );
        imageUrl = uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException(
          `Error al subir imagen: ${error.message}`,
        );
      }
    }

    // Validar que haya una imagen (archivo o URL)
    if (!imageUrl) {
      throw new BadRequestException(
        'Debe proporcionar una imagen (archivo o URL)',
      );
    }

    // Crear el banner
    const banner = this.bannerRepository.create({
      title: createBannerDto.title,
      description: createBannerDto.description,
      imageUrl,
      price: this.BANNER_PRICE,
      status: BannerStatus.PENDING_PAYMENT,
      userId: user.id,
      paymentAttempts: 1,
    });

    await this.bannerRepository.save(banner);

    // Crear preferencia de pago en Mercado Pago
    const preference = await this.createPaymentPreference(banner);

    banner.mercadoPagoPreferenceId = preference.id;
    await this.bannerRepository.save(banner);

    this.logger.log(`Banner creado: ${banner.id} - Usuario: ${user.id}`);

    return {
      id: banner.id,
      title: banner.title,
      description: banner.description,
      imageUrl: banner.imageUrl,
      status: banner.status,
      price: banner.price,
      paymentLink: preference.initPoint,
      message: 'Banner creado exitosamente. Complete el pago para activarlo.',
    };
  }

  /**
   * Crear preferencia de pago en Mercado Pago
   */
  private async createPaymentPreference(banner: Banner) {
    const preferenceData = {
      items: [
        {
          id: banner.id,
          title: `Banner Publicitario - ${banner.title}`,
          description: banner.description,
          category_id: 'advertising',
          quantity: 1,
          unit_price: this.BANNER_PRICE,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: 'user@test.com',
      },
      back_urls: {
        success: `${this.configService.get('FRONTEND_URL')}/banners/success`,
        failure: `${this.configService.get('FRONTEND_URL')}/banners/failure`,
        pending: `${this.configService.get('FRONTEND_URL')}/banners/pending`,
      },
      auto_return: 'approved' as const,
      notification_url: `${this.configService.get('BACKEND_URL')}/api/webhooks/mercadopago`,
      external_reference: banner.id,
      metadata: {
        banner_id: banner.id,
        user_id: banner.userId,
        type: 'banner',
      },
      statement_descriptor: 'PETSHOP BANNER',
    };

    return await this.mercadoPagoService.createPreference(preferenceData);
  }

  /**
   * Validar límite de banners activos por usuario
   */
  private async validateActiveBannersLimit(userId: string) {
    const activeBannersCount = await this.bannerRepository.count({
      where: {
        userId,
        status: BannerStatus.ACTIVE,
      },
    });

    if (activeBannersCount >= this.MAX_ACTIVE_BANNERS) {
      throw new BadRequestException(
        `Ya tienes ${this.MAX_ACTIVE_BANNERS} banners activos. Desactiva uno para crear otro.`,
      );
    }
  }

  /**
   * Listar banners del usuario autenticado
   */
  async findMyBanners(userId: string, filters: FilterBannersDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bannerRepository
      .createQueryBuilder('banner')
      .where('banner.userId = :userId', { userId });

    if (filters.status) {
      queryBuilder.andWhere('banner.status = :status', {
        status: filters.status,
      });
    }

    queryBuilder.orderBy('banner.createdAt', 'DESC');

    const [banners, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: banners,
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

  /**
   * Listar banners activos aleatoriamente (público)
   */
  async findActiveBanners(limit: number = 10) {
    const banners = await this.bannerRepository
      .createQueryBuilder('banner')
      .where('banner.status = :status', { status: BannerStatus.ACTIVE })
      .orderBy('RANDOM()')
      .take(limit)
      .getMany();

    return banners;
  }

  /**
   * Listar todos los banners con filtros (admin)
   */
  async findAll(filters: FilterBannersDto) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bannerRepository
      .createQueryBuilder('banner')
      .leftJoinAndSelect('banner.owner', 'owner');

    if (filters.status) {
      queryBuilder.andWhere('banner.status = :status', {
        status: filters.status,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('banner.userId = :userId', {
        userId: filters.userId,
      });
    }

    queryBuilder.orderBy('banner.createdAt', 'DESC');

    const [banners, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      data: banners.map((banner) => this.sanitizeBanner(banner)),
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

  /**
   * Obtener un banner por ID
   */
  async findOne(id: string, user: User) {
    const banner = await this.bannerRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    // Solo el dueño o admin pueden ver el banner
    if (banner.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permiso para ver este banner');
    }

    return this.sanitizeBanner(banner);
  }

  /**
   * Actualizar un banner
   */
  async update(
    id: string,
    updateBannerDto: UpdateBannerDto,
    user: User,
    imageFile?: Express.Multer.File,
  ) {
    const banner = await this.bannerRepository.findOne({
      where: { id },
      relations: ['owner'],
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    // Solo el dueño puede actualizar
    if (banner.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para actualizar este banner',
      );
    }

    // Si se sube una nueva imagen
    if (imageFile) {
      // Eliminar imagen anterior de Cloudinary
      if (banner.imageUrl) {
        try {
          const publicId =
            this.cloudinaryService.extractPublicId(banner.imageUrl);
          await this.cloudinaryService.deleteImage(publicId);
        } catch (error) {
          this.logger.error('Error al eliminar imagen anterior:', error);
        }
      }

      // Subir nueva imagen
      try {
        const uploadResult = await this.cloudinaryService.uploadImage(
          imageFile,
          'petshops/banners',
        );
        updateBannerDto.imageUrl = uploadResult.secure_url;
      } catch (error) {
        throw new BadRequestException(
          `Error al subir imagen: ${error.message}`,
        );
      }
    }

    // Solo admin puede cambiar el estado
    if (updateBannerDto.status && user.role !== UserRole.ADMIN) {
      delete updateBannerDto.status;
    }

    Object.assign(banner, updateBannerDto);
    await this.bannerRepository.save(banner);

    return {
      message: 'Banner actualizado exitosamente',
      banner: this.sanitizeBanner(banner),
    };
  }

  /**
   * Eliminar un banner
   */
  async remove(id: string, user: User) {
    const banner = await this.bannerRepository.findOne({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    // Solo el dueño o admin pueden eliminar
    if (banner.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar este banner',
      );
    }

    // Eliminar imagen de Cloudinary
    if (banner.imageUrl) {
      try {
        const publicId =
          this.cloudinaryService.extractPublicId(banner.imageUrl);
        await this.cloudinaryService.deleteImage(publicId);
      } catch (error) {
        this.logger.error('Error al eliminar imagen de Cloudinary:', error);
      }
    }

    await this.bannerRepository.remove(banner);

    return {
      message: 'Banner eliminado exitosamente',
    };
  }

  /**
   * Reintentar pago de un banner
   */
  async retryPayment(id: string, user: User) {
    const banner = await this.bannerRepository.findOne({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    if (banner.userId !== user.id) {
      throw new ForbiddenException(
        'No tienes permiso para reintentar el pago de este banner',
      );
    }

    if (
      banner.status !== BannerStatus.PENDING_PAYMENT &&
      banner.status !== BannerStatus.PAYMENT_FAILED
    ) {
      throw new BadRequestException(
        'Solo puedes reintentar el pago de banners pendientes o fallidos',
      );
    }

    if (banner.paymentAttempts >= this.MAX_PAYMENT_ATTEMPTS) {
      throw new BadRequestException(
        'Has alcanzado el límite máximo de intentos de pago',
      );
    }

    // Validar límite de banners activos
    await this.validateActiveBannersLimit(user.id);

    // Incrementar intentos
    banner.paymentAttempts += 1;
    await this.bannerRepository.save(banner);

    // Crear nueva preferencia de pago
    const preference = await this.createPaymentPreference(banner);

    banner.mercadoPagoPreferenceId = preference.id;
    await this.bannerRepository.save(banner);

    const attemptsRemaining =
      this.MAX_PAYMENT_ATTEMPTS - banner.paymentAttempts;

    return {
      message: 'Link de pago generado exitosamente',
      paymentLink: preference.initPoint,
      attemptsRemaining,
    };
  }

  /**
   * Obtener estado del pago de un banner
   */
  async getPaymentStatus(id: string, user: User) {
    const banner = await this.bannerRepository.findOne({
      where: { id },
    });

    if (!banner) {
      throw new NotFoundException('Banner no encontrado');
    }

    if (banner.userId !== user.id) {
      throw new ForbiddenException(
        'No tienes permiso para ver el estado de este banner',
      );
    }

    const canRetryPayment =
      (banner.status === BannerStatus.PENDING_PAYMENT ||
        banner.status === BannerStatus.PAYMENT_FAILED) &&
      banner.paymentAttempts < this.MAX_PAYMENT_ATTEMPTS;

    const attemptsRemaining =
      this.MAX_PAYMENT_ATTEMPTS - banner.paymentAttempts;

    return {
      bannerId: banner.id,
      status: banner.status,
      canRetryPayment,
      attemptsRemaining: Math.max(0, attemptsRemaining),
    };
  }

  /**
   * Procesar pago aprobado (llamado desde el webhook)
   */
  async processApprovedPayment(paymentData: any) {
    const bannerId = paymentData.external_reference;

    const banner = await this.bannerRepository.findOne({
      where: { id: bannerId },
    });

    if (!banner) {
      this.logger.error(`Banner no encontrado: ${bannerId}`);
      throw new NotFoundException('Banner no encontrado');
    }

    banner.status = BannerStatus.ACTIVE;
    banner.mercadoPagoPaymentId = paymentData.id;
    banner.paidAt = new Date();

    await this.bannerRepository.save(banner);

    this.logger.log(`✅ Banner activado: ${banner.id}`);

    return banner;
  }

  /**
   * Procesar pago rechazado (llamado desde el webhook)
   */
  async processRejectedPayment(paymentData: any) {
    const bannerId = paymentData.external_reference;

    const banner = await this.bannerRepository.findOne({
      where: { id: bannerId },
    });

    if (!banner) {
      this.logger.error(`Banner no encontrado: ${bannerId}`);
      throw new NotFoundException('Banner no encontrado');
    }

    banner.status = BannerStatus.PAYMENT_FAILED;
    banner.mercadoPagoPaymentId = paymentData.id;

    await this.bannerRepository.save(banner);

    this.logger.warn(`❌ Pago rechazado para banner: ${banner.id}`);

    return banner;
  }

  /**
   * Sanitizar información del banner (remover datos sensibles del owner)
   */
  private sanitizeBanner(banner: Banner) {
    if (banner.owner) {
      const {
        password,
        passwordResetToken,
        emailVerificationToken,
        ...owner
      } = banner.owner;
      return { ...banner, owner };
    }
    return banner;
  }
}
