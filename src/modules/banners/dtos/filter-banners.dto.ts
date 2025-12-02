import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BannerStatus } from '../entities/banner.entity';

export class FilterBannersDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Cantidad de resultados por página',
    example: 10,
    required: false,
    default: 10,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filtrar por estado del banner',
    enum: BannerStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;

  @ApiProperty({
    description: 'ID del usuario dueño del banner',
    required: false,
  })
  @IsOptional()
  userId?: string;
}
