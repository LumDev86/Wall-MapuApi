import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  Min,
  IsUUID,
  ValidateIf,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { CharacteristicDto } from './characteristic.dto';

export class CreateProductDto {
  @ApiProperty({
    example: 'Royal Canin Adulto 15kg',
    description: 'Nombre del producto',
  })
  @IsString()
  @MinLength(3)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    example: 'Alimento balanceado para perros adultos',
    description: 'Descripción detallada del producto',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    example: 45000,
    description: 'Precio al público (minorista)',
  })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  @Min(0.01, { message: 'El precio debe ser mayor a 0' })
  priceRetail: number;

  @ApiPropertyOptional({
    example: 38000,
    description: 'Precio mayorista (opcional, debe ser menor al precio retail)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || value === '' || value === 'null') return undefined;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  @Min(0.01, { message: 'El precio mayorista debe ser mayor a 0' })
  @ValidateIf((o) => o.priceWholesale !== undefined)
  priceWholesale?: number;

  @ApiProperty({
    example: 50,
    description: 'Cantidad en stock',
  })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;

  @ApiPropertyOptional({
    example: 'RC-15KG-001',
    description: 'SKU del producto (código interno)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toUpperCase())
  sku?: string;

  @ApiPropertyOptional({
    example: '7891234567890',
    description: 'Código de barras',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  barcode?: string;

  @ApiPropertyOptional({
    example: 'Royal Canin',
    description: 'Marca del producto',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  brand?: string;

  @ApiPropertyOptional({
    example: [
      { name: 'Peso', value: '15 kg' },
      { name: 'Edad', value: 'Adulto' },
      { name: 'Raza', value: 'Todas las razas' },
    ],
    description: 'Características del producto (máximo 20)',
    type: [CharacteristicDto],
  })
  @IsOptional()
  @IsArray({ message: 'Las características deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => CharacteristicDto)
  @ArrayMaxSize(20, { message: 'Máximo 20 características permitidas' })
  characteristics?: CharacteristicDto[];

  @ApiProperty({
    example: 'uuid-de-categoria',
    description: 'ID de la categoría',
  })
  @IsUUID('4', { message: 'categoryId debe ser un UUID válido' })
  @Transform(({ value }) => value?.trim())
  categoryId: string;
}