import { IsString, IsOptional, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryMultipartDto {
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
    example: 1,
    description: 'Orden de visualización',
  })
  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  order?: number;

  @ApiPropertyOptional({
    example: 'uuid-de-categoria-padre',
    description: 'ID de la categoría padre (para subcategorías)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    // Convertir string vacío a null
    if (value === '' || value === 'null' || value === 'undefined') {
      return null;
    }
    return value;
  })
  parentId?: string | null;
}