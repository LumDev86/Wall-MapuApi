import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdatePromotionalBannerDto {
  @ApiProperty({
    example: '¡Ofertas de Verano!',
    description: 'Título del banner promocional',
  })
  @IsString({ message: 'El título debe ser un string' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El título no puede exceder 50 caracteres' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @ApiProperty({
    example: 'Hasta 30% de descuento en productos seleccionados',
    description: 'Subtítulo o descripción del banner',
  })
  @IsString({ message: 'El subtítulo debe ser un string' })
  @MinLength(3, { message: 'El subtítulo debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El subtítulo no puede exceder 100 caracteres' })
  @Transform(({ value }) => value?.trim())
  subtitle: string;

  @ApiProperty({
    example: 'https://gdfiblfkfegyqbtvcewa.supabase.co/storage/v1/object/public/Wall-MapuApi/banners/...',
    description: 'URL de la imagen del banner (desde Supabase Storage)',
  })
  @IsUrl({}, { message: 'La URL de la imagen no es válida' })
  @IsString({ message: 'imageUrl debe ser un string' })
  imageUrl: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Si el banner está activo y se debe mostrar',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser un booleano' })
  isActive?: boolean;
}
