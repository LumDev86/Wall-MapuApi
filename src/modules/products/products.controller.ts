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
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { FilterProductsDto } from './dtos/filter-products.dto';
import { SearchProductsDto } from './dtos/search-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('shop/:shopId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear producto' })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  create(
    @Param('shopId') shopId: string,
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.create(createProductDto, shopId, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos con filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'brand', required: false, type: String })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de productos' })
  findAll(@Query() filters: FilterProductsDto) {
    return this.productsService.findAll(filters);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Búsqueda en tiempo real de productos con información de tienda',
    description: 'Endpoint optimizado para autocompletado. Busca productos mientras el usuario tipea y muestra la tienda con calificaciones. Si se proporciona geolocalización, ordena por distancia. Mínimo 2 caracteres requeridos.'
  })
  @ApiQuery({
    name: 'query',
    required: true,
    type: String,
    description: 'Término de búsqueda (mínimo 2 caracteres)',
    example: 'Royal'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Máximo de resultados (default: 10, max: 20)',
    example: 10
  })
  @ApiQuery({
    name: 'latitude',
    required: false,
    type: Number,
    description: 'Latitud del usuario para ordenar por distancia',
    example: -34.6037
  })
  @ApiQuery({
    name: 'longitude',
    required: false,
    type: Number,
    description: 'Longitud del usuario para ordenar por distancia',
    example: -58.3816
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de productos con información de tienda',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              brand: { type: 'string' },
              priceRetail: { type: 'number' },
              priceWholesale: { type: 'number' },
              stock: { type: 'number' },
              images: { type: 'array', items: { type: 'string' } },
              category: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                }
              },
              shop: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-tienda' },
                  name: { type: 'string', example: 'PetShop San Martín' },
                  rating: { type: 'number', example: 4.5, description: 'Calificación promedio (1-5)' },
                  reviewCount: { type: 'number', example: 12, description: 'Cantidad de reseñas' },
                  distance: { type: 'number', example: 2.5, description: 'Distancia en km (solo si se envió geolocalización)' },
                }
              }
            }
          }
        },
        total: { type: 'number' },
        query: { type: 'string' },
        cached: { type: 'boolean' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Query inválido (menos de 2 caracteres)' })
  searchProducts(@Query() searchDto: SearchProductsDto) {
    return this.productsService.searchProducts(searchDto);
  }

  @Get('shop/:shopId')
  @ApiOperation({ summary: 'Listar productos de un local específico (HU-006)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Catálogo del local' })
  findByShop(
    @Param('shopId') shopId: string,
    @Query() filters: FilterProductsDto,
  ) {
    return this.productsService.findByShop(shopId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un producto' })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Actualizar producto (solo dueño del shop)' })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar producto (solo dueño del shop)' })
  @ApiResponse({ status: 200, description: 'Producto eliminado' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.remove(id, user);
  }
}
