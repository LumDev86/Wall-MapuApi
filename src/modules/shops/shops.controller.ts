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
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ 
    summary: 'Registrar un nuevo local (HU-004)',
    description: `
      Registra un nuevo local con dos opciones para las coordenadas:
      
      1. **Enviar coordenadas directamente**: El frontend puede enviar latitude y longitude
         obtenidas desde el navegador (geolocalización) o selección en mapa.
      
      2. **Geocoding automático**: Si no se envían coordenadas, el backend las calculará
         automáticamente desde la dirección, ciudad y provincia.
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'address', 'province', 'city', 'type'],
      properties: {
        name: { type: 'string', example: 'Pet Shop Amigo Fiel' },
        description: { type: 'string', example: 'Veterinaria y pet shop' },
        latitude: { 
          type: 'number', 
          example: -34.603722,
          description: 'Latitud (opcional, se calcula automáticamente si no se provee)'
        },
        longitude: { 
          type: 'number', 
          example: -58.381592,
          description: 'Longitud (opcional, se calcula automáticamente si no se provee)'
        },
        address: { type: 'string', example: 'Av. Corrientes 1234' },
        province: { type: 'string', example: 'Buenos Aires' },
        city: { type: 'string', example: 'CABA' },
        type: { type: 'string', enum: ['retailer', 'wholesaler'], example: 'retailer' },
        phone: { type: 'string', example: '+54 9 11 1234-5678' },
        email: { type: 'string', example: 'info@petshop.com' },
        website: { type: 'string', example: 'https://www.petshop.com' },
        schedule: { 
          type: 'string', 
          example: '{"monday":{"open":"09:00","close":"18:00"},"tuesday":{"open":"09:00","close":"18:00"}}'
        },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Local registrado exitosamente',
  })
  async create(
    @Body() createShopDto: CreateShopDto,
    @CurrentUser() user: User,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
  ) {
    return this.shopsService.create(createShopDto, user, files);
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
  @ApiOperation({ summary: 'Obtener detalle de un local' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del local con información completa',
  })
  @ApiResponse({ status: 404, description: 'Local no encontrado' })
  findOne(@Param('id') id: string) {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actualizar un local con imágenes (solo dueño) (HU-009)',
    description: `
      Actualiza un local existente. Puede incluir:
      - Coordenadas explícitas (latitude, longitude)
      - Dirección (se recalculan coordenadas si no se proveen explícitas)
      - Imágenes (logo, banner)
      - Otros campos del local
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        latitude: { type: 'number', description: 'Latitud opcional' },
        longitude: { type: 'number', description: 'Longitud opcional' },
        address: { type: 'string' },
        province: { type: 'string' },
        city: { type: 'string' },
        type: { type: 'string', enum: ['retailer', 'wholesaler'] },
        phone: { type: 'string' },
        email: { type: 'string' },
        website: { type: 'string' },
        schedule: { type: 'string', example: '{"monday":{"open":"09:00","close":"18:00"}}' },
        logo: { type: 'string', format: 'binary' },
        banner: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Local actualizado exitosamente',
  })
  update(
    @Param('id') id: string,
    @Body() updateShopDto: UpdateShopDto,
    @CurrentUser() user: User,
    @UploadedFiles()
    files?: {
      logo?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    },
  ) {
    return this.shopsService.update(id, updateShopDto, user, files);
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