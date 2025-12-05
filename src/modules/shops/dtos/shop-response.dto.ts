import { ApiProperty } from '@nestjs/swagger';
import { Shop, ShopType, ShopStatus } from '../entities/shop.entity';

// DTO para Owner en respuestas de Shop (todos los campos para Swagger)
export class OwnerBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  province?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty({ required: false })
  address?: string;

  @ApiProperty({ required: false })
  latitude?: number;

  @ApiProperty({ required: false })
  longitude?: number;

  @ApiProperty()
  role: string;

  @ApiProperty()
  isEmailVerified: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(user: any): OwnerBasicDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      province: user.province,
      city: user.city,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

// DTO simplificado para Product en respuestas de Shop
export class ProductBasicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  priceRetail: number;

  @ApiProperty({ required: false })
  priceWholesale?: number;

  @ApiProperty()
  stock: number;

  @ApiProperty({ type: [String] })
  images: string[];

  static fromEntity(product: any): ProductBasicDto {
    return {
      id: product.id,
      name: product.name,
      priceRetail: product.priceRetail,
      priceWholesale: product.priceWholesale,
      stock: product.stock,
      images: product.images || [],
    };
  }
}

// DTO de respuesta para Shop individual
export class ShopResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ required: false })
  province?: string;

  @ApiProperty({ required: false })
  city?: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty({ enum: ShopType })
  type: ShopType;

  @ApiProperty({ enum: ShopStatus })
  status: ShopStatus;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  website?: string;

  @ApiProperty({ required: false, type: Object })
  schedule?: any;

  @ApiProperty({ required: false })
  logo?: string;

  @ApiProperty({ required: false })
  banner?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: () => OwnerBasicDto, required: false })
  owner?: OwnerBasicDto;

  @ApiProperty({ type: [ProductBasicDto], required: false })
  products?: ProductBasicDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(shop: Shop, includeOwner = false, includeProducts = false): ShopResponseDto {
    const dto: ShopResponseDto = {
      id: shop.id,
      name: shop.name,
      description: shop.description,
      address: shop.address,
      province: shop.province,
      city: shop.city,
      latitude: shop.latitude,
      longitude: shop.longitude,
      type: shop.type,
      status: shop.status,
      phone: shop.phone,
      email: shop.email,
      website: shop.website,
      schedule: shop.schedule,
      logo: shop.logo,
      banner: shop.banner,
      isActive: shop.isActive,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
    };

    if (includeOwner && shop.owner) {
      dto.owner = OwnerBasicDto.fromEntity(shop.owner);
    }

    if (includeProducts && shop.products) {
      dto.products = shop.products.map((p) => ProductBasicDto.fromEntity(p));
    }

    return dto;
  }
}

// DTO de respuesta para lista de shops
export class ShopListResponseDto {
  @ApiProperty({ type: [ShopResponseDto] })
  data: ShopResponseDto[];

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
