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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
import { UpdatePromotionalBannerDto } from './dtos/update-promotional-banner.dto';
import { FilterShopsDto } from './dtos/filter-shops.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtAuthOptionalGuard } from '../../common/guards/jwt-auth-optional.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Registrar un nuevo local (HU-004)',
    description: 'Registra un nuevo local. Las coordenadas (latitude, longitude) deben ser enviadas desde el frontend.',
  })
  @ApiResponse({
    status: 201,
    description: 'Local registrado exitosamente',
  })
  async create(
    @Body() createShopDto: CreateShopDto,
    @CurrentUser() user: User,
  ) {
    return this.shopsService.create(createShopDto, user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ 
    summary: 'Obtener mi local (usuario autenticado)',
    description: 'Retorna el local del usuario autenticado. Útil para que el dueño gestione su propio local.'
  })
  @ApiResponse({
    status: 200,
    description: 'Local del usuario autenticado',
  })
  @ApiResponse({
    status: 404,
    description: 'El usuario no tiene un local registrado',
  })
  findMyShop(@CurrentUser() user: User) {
    return this.shopsService.findMyShop(user);
  }

  @Get()
  @UseGuards(JwtAuthOptionalGuard)
  @ApiOperation({
    summary: 'Listar locales en el mapa con filtros y paginación (HU-001, HU-002, HU-003, HU-007)',
    description: `
      Retorna la lista de shops para mostrar en el mapa con soporte de paginación.
      
      **Paginación:**
      - page: Número de página (default: 1)
      - limit: Resultados por página (default: 10, max: 100)
      
      **HU-002 - Filtrado automático por rol:**
      - CLIENTE → ve MINORISTAS
      - MINORISTA → ve MAYORISTAS
      - MAYORISTA / ADMIN → ve todos
      - Invitado → ve locales activos
      
      **HU-003 - Filtro "abiertos ahora"**
      **HU-007 - Filtro por producto**
      **Filtro por ubicación**
    `,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['retailer', 'wholesaler'] })
  @ApiQuery({ name: 'latitude', required: false, type: Number })
  @ApiQuery({ name: 'longitude', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  @ApiQuery({ name: 'openNow', required: false, type: Boolean })
  @ApiQuery({ name: 'product', required: false, type: String })
  findAll(
    @Query() filters: FilterShopsDto,
    @CurrentUser() user: User | null,
  ) {
    return this.shopsService.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalle de un local con sus productos paginados',
    description: `
      Retorna el detalle del local incluyendo sus productos con paginación.

      **Paginación de productos:**
      - page: Número de página (default: 1)
      - limit: Productos por página (default: 10, max: 100)
    `,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página para productos' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Cantidad de productos por página' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del local con información completa y productos paginados',
  })
  @ApiResponse({ status: 404, description: 'Local no encontrado' })
  findOne(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shopsService.findOne(id, page, limit);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar un local (solo dueño) (HU-009)',
    description: 'Actualiza un local existente. Las coordenadas (latitude, longitude) deben ser enviadas desde el frontend si cambian.',
  })
  @ApiResponse({
    status: 200,
    description: 'Local actualizado exitosamente',
  })
  update(
    @Param('id') id: string,
    @Body() updateShopDto: UpdateShopDto,
    @CurrentUser() user: User,
  ) {
    return this.shopsService.update(id, updateShopDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar un local (solo dueño)' })
  @ApiResponse({
    status: 200,
    description: 'Local eliminado exitosamente',
  })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.shopsService.remove(id, user);
  }

  @Patch(':id/promotional-banner')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Actualizar banner promocional (solo plan wholesaler)',
    description: 'Actualiza o crea el banner promocional de la tienda. Solo disponible para tiendas con plan wholesaler.',
  })
  @ApiBody({ type: UpdatePromotionalBannerDto })
  @ApiResponse({
    status: 200,
    description: 'Banner promocional actualizado exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo tiendas con plan wholesaler pueden tener banners promocionales',
  })
  async updatePromotionalBanner(
    @Param('id') id: string,
    @Body() updatePromotionalBannerDto: UpdatePromotionalBannerDto,
    @CurrentUser() user: User,
  ) {
    return this.shopsService.updatePromotionalBanner(id, updatePromotionalBannerDto, user);
  }
}
