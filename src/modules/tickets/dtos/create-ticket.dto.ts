import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({
    description: 'Asunto del ticket',
    example: 'Problema con el pago',
  })
  @IsString()
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres' })
  subject: string;

  @ApiProperty({
    description: 'Mensaje detallado del problema',
    example: 'No puedo completar el pago con mi tarjeta de crédito...',
  })
  @IsString()
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  message: string;

  @ApiPropertyOptional({
    description: 'Categoría del ticket',
    enum: TicketCategory,
    example: TicketCategory.BILLING,
  })
  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @ApiPropertyOptional({
    description: 'Prioridad del ticket',
    enum: TicketPriority,
    example: TicketPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}
