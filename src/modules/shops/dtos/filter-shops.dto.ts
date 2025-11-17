import { IsOptional, IsEnum, IsBoolean, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShopType, ShopStatus } from '../entities/shop.entity';

export class FilterShopsDto {
  // Paginación
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página (default: 1)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Cantidad de resultados por página (default: 10, max: 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  // Filtros existentes
  @ApiPropertyOptional({
    enum: ShopType,
    description: 'Filtrar por tipo de comercio',
  })
  @IsOptional()
  @IsEnum(ShopType)
  type?: ShopType;

  @ApiPropertyOptional({
    enum: ShopStatus,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(ShopStatus)
  status?: ShopStatus;

  @ApiPropertyOptional({
    example: -34.603722,
    description: 'Latitud del punto central para búsqueda por radio',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    example: -58.381592,
    description: 'Longitud del punto central para búsqueda por radio',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Radio de búsqueda en kilómetros',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  radius?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar solo locales abiertos en este momento',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  openNow?: boolean;

  @ApiPropertyOptional({
    example: 'alimento',
    description: 'Buscar por nombre de producto',
  })
  @IsOptional()
  @IsString()
  product?: string;
}