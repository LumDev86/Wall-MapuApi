import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({
    example: 'Royal Canin Adulto 15kg',
    description: 'Nombre del producto',
  })
  @IsString()
  @MinLength(3)
  name: string;

  @ApiPropertyOptional({
    example: 'Alimento balanceado para perros adultos',
    description: 'Descripción detallada del producto',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 45000,
    description: 'Precio al público (minorista)',
  })
  @Type(() => Number) // ✅ Convierte string a number
  @Transform(({ value }) => parseFloat(value)) // ✅ Asegura conversión
  @IsNumber()
  @Min(0)
  priceRetail: number;

  @ApiPropertyOptional({
    example: 38000,
    description: 'Precio mayorista (opcional)',
  })
  @IsOptional()
  @Type(() => Number) // ✅ Convierte string a number
  @Transform(({ value }) => value ? parseFloat(value) : undefined) // ✅ Maneja undefined
  @IsNumber()
  @Min(0)
  priceWholesale?: number;

  @ApiProperty({
    example: 50,
    description: 'Cantidad en stock',
  })
  @Type(() => Number) // ✅ Convierte string a number
  @Transform(({ value }) => parseInt(value, 10)) // ✅ Asegura conversión
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({
    example: 'RC-15KG-001',
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
    example: 'uuid-de-categoria',
    description: 'ID de la categoría',
  })
  @IsUUID()
  categoryId: string;
}