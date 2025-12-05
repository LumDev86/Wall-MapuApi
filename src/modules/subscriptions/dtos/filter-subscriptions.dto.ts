import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
  IsDateString
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus } from '../entities/subscription.entity';

export class FilterSubscriptionsDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página (default: 1)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Cantidad de resultados por página (default: 10, max: 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    description: 'Filtrar por estado de la suscripción',
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    description: 'Filtrar por tipo de plan',
  })
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    example: 'uuid-123',
    description: 'Filtrar por ID de usuario (solo para admin)',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Fecha de inicio del rango de búsqueda (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha de fin del rango de búsqueda (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
