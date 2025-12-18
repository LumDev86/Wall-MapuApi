import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus, TicketPriority, TicketCategory } from '../entities/ticket.entity';

export class FilterTicketsDto {
  @ApiPropertyOptional({
    description: 'Búsqueda por asunto, usuario o ID',
    example: 'problema pago',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: TicketStatus,
    example: TicketStatus.OPEN,
  })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por prioridad',
    enum: TicketPriority,
    example: TicketPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({
    description: 'Filtrar por categoría',
    enum: TicketCategory,
    example: TicketCategory.BILLING,
  })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

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
