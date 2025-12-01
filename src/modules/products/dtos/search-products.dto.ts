import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchProductsDto {
  @ApiProperty({
    example: 'Royal',
    description: 'Término de búsqueda (mínimo 2 caracteres)',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'El término de búsqueda debe tener al menos 2 caracteres' })
  query: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Número máximo de resultados (por defecto 10, máximo 20)',
    minimum: 1,
    maximum: 20,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number;

  @ApiPropertyOptional({
    example: -34.6037,
    description: 'Latitud de la ubicación del usuario para ordenar por distancia',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: -58.3816,
    description: 'Longitud de la ubicación del usuario para ordenar por distancia',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
