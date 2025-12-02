import { IsString, IsOptional, IsUrl, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BannerStatus } from '../entities/banner.entity';

export class UpdateBannerDto {
  @ApiProperty({
    description: 'Título del banner',
    example: 'Promoción de Verano 2025',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiProperty({
    description: 'Descripción del banner',
    example: 'Descuentos de hasta 50% en todos los productos para mascotas',
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'URL de la imagen del banner',
    example: 'https://ejemplo.com/banner.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({
    description: 'Estado del banner (solo admin puede cambiar el estado)',
    enum: BannerStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;
}
