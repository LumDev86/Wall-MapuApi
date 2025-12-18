import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '../entities/ticket.entity';

export class UpdateTicketStatusDto {
  @ApiProperty({
    description: 'Nuevo estado del ticket',
    enum: TicketStatus,
    example: TicketStatus.IN_PROGRESS,
  })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}
