import { IsString, IsOptional, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Alimentos',
    description: 'Nombre de la categoría',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'Alimentos para perros y gatos',
    description: 'Descripción de la categoría',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cloudinary.com/icon.png',
    description: 'URL del ícono de la categoría',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Orden de visualización',
  })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({
    example: 'uuid-de-categoria-padre',
    description: 'ID de la categoría padre (para subcategorías)',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}