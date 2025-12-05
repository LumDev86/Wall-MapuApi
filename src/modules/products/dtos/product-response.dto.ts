import { ApiProperty } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';

// DTO simplificado para Shop en respuestas de Product
export class ShopBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiProperty({ required: false })
  logo?: string;

  static fromEntity(shop: any): ShopBasicDto {
    return {
      id: shop.id,
      name: shop.name,
      type: shop.type,
      logo: shop.logo,
    };
  }
}

// DTO simplificado para Category en respuestas de Product
export class CategoryBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  icon?: string;

  static fromEntity(category: any): CategoryBasicDto {
    return {
      id: category.id,
      name: category.name,
      icon: category.icon,
    };
  }
}

// DTO de respuesta para Product individual
export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  priceRetail: number;

  @ApiProperty({ required: false })
  priceWholesale?: number;

  @ApiProperty()
  stock: number;

  @ApiProperty({ required: false })
  sku?: string;

  @ApiProperty({ required: false })
  barcode?: string;

  @ApiProperty({ required: false })
  brand?: string;

  @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
  characteristics?: Array<{ name: string; value: string }>;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: () => ShopBasicDto, required: false })
  shop?: ShopBasicDto;

  @ApiProperty({ type: () => CategoryBasicDto, required: false })
  category?: CategoryBasicDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(product: Product, includeRelations = true): ProductResponseDto {
    const dto: ProductResponseDto = {
      id: product.id,
      name: product.name,
      description: product.description,
      priceRetail: product.priceRetail,
      priceWholesale: product.priceWholesale,
      stock: product.stock,
      sku: product.sku,
      barcode: product.barcode,
      brand: product.brand,
      characteristics: product.characteristics,
      images: product.images || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    if (includeRelations) {
      if (product.shop) {
        dto.shop = ShopBasicDto.fromEntity(product.shop);
      }
      if (product.category) {
        dto.category = CategoryBasicDto.fromEntity(product.category);
      }
    }

    return dto;
  }
}

// DTO de respuesta para lista de productos
export class ProductListResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty({
    type: 'object',
    properties: {
      total: { type: 'number' },
      page: { type: 'number' },
      limit: { type: 'number' },
      totalPages: { type: 'number' },
      hasNextPage: { type: 'boolean' },
      hasPrevPage: { type: 'boolean' },
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
