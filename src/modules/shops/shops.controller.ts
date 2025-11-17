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
} from '@nestjs/swagger';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dtos/create-shop.dto';
import { UpdateShopDto } from './dtos/update-shop.dto';
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
  @ApiOperation({ summary: 'Registrar un nuevo local (HU-004)' })
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

  @Get()
  @UseGuards(JwtAuthOptionalGuard)
  @ApiOperation({
    summary:
      'Listar locales en el mapa con filtros y paginación (HU-001, HU-002, HU-003)',
    description: `
      Retorna la lista de shops para mostrar en el mapa con soporte de paginación.
      
      **Paginación:**
      - page: Número de página (default: 1)
      - limit: Resultados por página (default: 10, max: 100)
      
      **HU-002 - Filtrado automático por rol:**
      - Si el usuario está autenticado como CLIENTE → solo ve MINORISTAS
      - Si el usuario está autenticado como MINORISTA → solo ve MAYORISTAS
      - Si el usuario está autenticado como MAYORISTA o ADMIN → ve todos
      - Si NO está autenticado → ve todos los locales activos
      
      **HU-003 - Filtro "abiertos ahora":**
      - Usa el parámetro openNow=true para ver solo locales abiertos en este momento
      
      **Filtro por ubicación:**
      - Envía latitude, longitude y radius para buscar locales cercanos
    `,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['retailer', 'wholesaler'],
    description: 'Filtrar por tipo de comercio (manual)',
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    description: 'Latitud del usuario para búsqueda por proximidad',
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    description: 'Longitud del usuario para búsqueda por proximidad',
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    type: Number,
    description: 'Radio de búsqueda en kilómetros (default: 10)',
  })
  @ApiQuery({
    name: 'openNow',
    required: false,
    type: Boolean,
    description: 'true = solo locales abiertos en este momento (HU-003)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de locales',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            name: 'Pet Shop Amigo Fiel',
            type: 'retailer',
            latitude: -34.603722,
            longitude: -58.381592,
            address: 'Av. Corrientes 1234',
            city: 'CABA',
            province: 'Buenos Aires',
            phone: '+54 9 11 1234-5678',
            isOpenNow: true,
            status: 'active',
          },
        ],
        pagination: {
          total: 45,
          page: 1,
          limit: 10,
          totalPages: 5,
          hasNextPage: true,
          hasPrevPage: false,
        },
        filters: {
          byRole: 'client',
          showingType: 'retailer',
        },
      },
    },
  })
  findAll(
    @Query() filters: FilterShopsDto,
    @CurrentUser() user: User | null,
  ) {
    return this.shopsService.findAll(filters, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un local' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del local con información completa',
  })
  @ApiResponse({
    status: 404,
    description: 'Local no encontrado',
  })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar un local (solo dueño) (HU-009)' })
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
}