import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({
    description: 'Título del banner',
    example: 'Promoción de Verano 2025',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Descripción del banner',
    example: 'Descuentos de hasta 50% en todos los productos para mascotas',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'URL de la imagen del banner (si se proporciona URL en lugar de archivo)',
    example: 'https://ejemplo.com/banner.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
