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
  name: string;

  @ApiPropertyOptional({
    example: 'Veterinaria y pet shop con más de 10 años de experiencia',
    description: 'Descripción del negocio',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Av. Corrientes 1234',
    description: 'Dirección (calle y número)',
  })
  @IsString()
  address: string;

  @ApiProperty({
    example: 'Buenos Aires',
    description: 'Provincia',
  })
  @IsString()
  province: string;

  @ApiProperty({
    example: 'Ciudad Autónoma de Buenos Aires',
    description: 'Ciudad o localidad',
  })
  @IsString()
  city: string;

  // ❌ ELIMINADOS latitude y longitude
  // Se calculan automáticamente en el backend

  @ApiProperty({
    enum: ShopType,
    example: ShopType.RETAILER,
    description: 'Tipo de comercio: minorista o mayorista',
  })
  @IsEnum(ShopType)
  type: ShopType;

  @ApiPropertyOptional({
    example: '+54 9 11 1234-5678',
    description: 'Teléfono de contacto',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'info@petshop.com',
    description: 'Email de contacto',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'https://www.petshop.com',
    description: 'Sitio web',
  })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '09:00', close: '13:00' },
    },
    description: 'Horarios de atención por día',
  })
  @IsOptional()
  @IsObject()
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
    example: 'https://example.com/logo.png',
    description: 'URL del logo del local',
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/banner.png',
    description: 'URL del banner publicitario',
  })
  @IsOptional()
  @IsUrl()
  banner?: string;
}