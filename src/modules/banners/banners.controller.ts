import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BannersService } from './services/banners.service';
import {
  CreateBannerDto,
  UpdateBannerDto,
  FilterBannersDto,
  BannerResponseDto,
  PaymentStatusResponseDto,
  RetryPaymentResponseDto,
} from './dtos';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../../common/guards/jwt-auth-optional.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear un banner publicitario',
    description: `
      Crea un nuevo banner publicitario y genera el link de pago de Mercado Pago.

      Puedes subir una imagen desde tu equipo o proporcionar una URL.

      **Precio:** $1500 ARS por banner
      **Límite:** Máximo 3 banners activos por usuario
      **Límite de intentos de pago:** 5 intentos máximo
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'description'],
      properties: {
        title: {
          type: 'string',
          example: 'Promoción de Verano 2025',
          maxLength: 100,
        },
        description: {
          type: 'string',
          example: 'Descuentos de hasta 50% en todos los productos',
          maxLength: 500,
        },
        imageUrl: {
          type: 'string',
          example: 'https://ejemplo.com/banner.jpg',
          description: 'URL de la imagen (opcional si subes archivo)',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Imagen del banner (opcional si envías imageUrl)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Banner creado exitosamente. Retorna el link de pago.',
    type: BannerResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Ya tienes 3 banners activos o error al crear preferencia de pago',
  })
  create(
    @Body() createBannerDto: CreateBannerDto,
    @CurrentUser() user: User,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.bannersService.create(createBannerDto, user, image);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar mis banners',
    description: 'Obtiene todos los banners del usuario autenticado con paginación',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending_payment', 'active', 'inactive', 'payment_failed'] })
  @ApiResponse({
    status: 200,
    description: 'Lista de banners del usuario',
  })
  findMyBanners(
    @CurrentUser() user: User,
    @Query() filters: FilterBannersDto,
  ) {
    return this.bannersService.findMyBanners(user.id, filters);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Listar banners activos (público)',
    description: `
      Obtiene banners activos de forma aleatoria para mostrar en la aplicación.

      Este endpoint es público y no requiere autenticación.
      Los banners se devuelven en orden aleatorio.
    `,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Cantidad de banners a retornar (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de banners activos en orden aleatorio',
  })
  findActiveBanners(@Query('limit') limit?: number) {
    return this.bannersService.findActiveBanners(limit ? Number(limit) : 10);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Listar todos los banners (solo admin)',
    description: 'Obtiene todos los banners con filtros y paginación. Solo para administradores.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['pending_payment', 'active', 'inactive', 'payment_failed'] })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los banners',
  })
  findAll(@Query() filters: FilterBannersDto) {
    return this.bannersService.findAll(filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener detalle de un banner',
    description: 'Solo el dueño o un admin pueden ver el detalle del banner',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle del banner',
  })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para ver este banner',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bannersService.findOne(id, user);
  }

  @Get(':id/payment-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtener estado del pago de un banner',
    description:
      'Consulta el estado actual del pago, si puede reintentar, y cuántos intentos quedan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del pago del banner',
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  getPaymentStatus(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bannersService.getPaymentStatus(id, user);
  }

  @Post(':id/retry-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Reintentar pago de un banner',
    description: `
      Genera un nuevo link de pago para un banner en estado PENDING o PAYMENT_FAILED.

      **Límite:** 5 intentos máximo por banner.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevo link de pago generado exitosamente',
    type: RetryPaymentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'El banner no está en estado pendiente/fallido o se excedió el límite de intentos',
  })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  retryPayment(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bannersService.retryPayment(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actualizar un banner',
    description: `
      Actualiza la información de un banner.
      Solo el dueño puede actualizar el banner.
      Solo admin puede cambiar el estado.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 100 },
        description: { type: 'string', maxLength: 500 },
        imageUrl: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        status: {
          type: 'string',
          enum: ['pending_payment', 'active', 'inactive', 'payment_failed'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Banner actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para actualizar este banner',
  })
  update(
    @Param('id') id: string,
    @Body() updateBannerDto: UpdateBannerDto,
    @CurrentUser() user: User,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.bannersService.update(id, updateBannerDto, user, image);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Eliminar un banner',
    description: 'Solo el dueño o un admin pueden eliminar el banner',
  })
  @ApiResponse({
    status: 200,
    description: 'Banner eliminado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Banner no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'No tienes permiso para eliminar este banner',
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.bannersService.remove(id, user);
  }
}
