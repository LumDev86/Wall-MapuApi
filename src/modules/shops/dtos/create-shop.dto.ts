import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsEmail,
  IsUrl,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ShopType } from '../entities/shop.entity';

class ScheduleDto {
  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  open?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @IsString()
  close?: string;
}

export class CreateShopDto {
  @ApiProperty({
    example: 'Pet Shop Amigo Fiel',
    description: 'Nombre del comercio',
  })
  @IsString()
  @MinLength(3)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    example: 'Veterinaria y pet shop con más de 10 años de experiencia',
    description: 'Descripción del negocio',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiProperty({
    example: 'Av. Corrientes 1234',
    description: 'Dirección (calle y número)',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  address: string;

  @ApiProperty({
    example: 'Buenos Aires',
    description: 'Provincia',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  province: string;

  @ApiProperty({
    example: 'Ciudad Autónoma de Buenos Aires',
    description: 'Ciudad o localidad',
  })
  @IsString()
  @Transform(({ value }) => value?.trim())
  city: string;

  @ApiProperty({
    enum: ShopType,
    example: ShopType.RETAILER,
    description: 'Tipo de comercio: retailer (minorista) o wholesaler (mayorista)',
  })
  @IsEnum(ShopType, { 
    message: 'El tipo debe ser "retailer" o "wholesaler"' 
  })
  type: ShopType;

  @ApiPropertyOptional({
    example: '+54 9 11 1234-5678',
    description: 'Teléfono de contacto',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  phone?: string;

  @ApiPropertyOptional({
    example: 'info@petshop.com',
    description: 'Email de contacto',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email?: string;

  @ApiPropertyOptional({
    example: 'https://www.petshop.com',
    description: 'Sitio web',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL inválida' })
  @Transform(({ value }) => value?.trim())
  website?: string;

  @ApiPropertyOptional({
    example: '{"monday":{"open":"09:00","close":"18:00"},"tuesday":{"open":"09:00","close":"18:00"},"wednesday":{"open":"09:00","close":"18:00"},"thursday":{"open":"09:00","close":"18:00"},"friday":{"open":"09:00","close":"18:00"},"saturday":{"open":"09:00","close":"13:00"}}',
    description: 'Horarios de atención por día (JSON string cuando se envía via form-data)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'object' && value !== null) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject({ message: 'schedule debe ser un objeto JSON válido' })
  schedule?: {
    monday?: ScheduleDto;
    tuesday?: ScheduleDto;
    wednesday?: ScheduleDto;
    thursday?: ScheduleDto;
    friday?: ScheduleDto;
    saturday?: ScheduleDto;
    sunday?: ScheduleDto;
  };

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Logo del local (archivo de imagen)',
  })
  @IsOptional()
  logo?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Banner publicitario (archivo de imagen)',
  })
  @IsOptional()
  banner?: any;
}