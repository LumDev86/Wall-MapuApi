import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Royal Canin Adulto 15kg',
    description: 'Nombre del producto',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    example: 'Alimento balanceado premium para perros adultos',
    description: 'Descripción del producto',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 45000,
    description: 'Precio para minoristas (en pesos)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceRetail?: number;

  @ApiPropertyOptional({
    example: 38000,
    description: 'Precio para mayoristas (en pesos)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceWholesale?: number;

  @ApiProperty({
    example: 50,
    description: 'Cantidad en stock',
    default: 0,
  })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({
    example: 'RC-ADU-15',
    description: 'SKU del producto',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    example: '7891234567890',
    description: 'Código de barras',
  })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({
    example: 'Royal Canin',
    description: 'Marca del producto',
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    example: 'uuid-categoria',
    description: 'ID de la categoría',
  })
  @IsString()
  categoryId: string;
}