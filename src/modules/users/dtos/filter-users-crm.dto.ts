import { IsOptional, IsString, IsEnum, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class FilterUsersCrmDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por nombre, email o teléfono',
    example: 'juan',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por rol de usuario',
    enum: UserRole,
    example: UserRole.CLIENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filtrar por provincia',
    example: 'Buenos Aires',
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo/inactivo',
    enum: ['active', 'inactive', 'all'],
    example: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Número de página',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de resultados por página',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
