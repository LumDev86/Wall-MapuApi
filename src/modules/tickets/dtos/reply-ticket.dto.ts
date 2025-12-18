import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyTicketDto {
  @ApiProperty({
    description: 'Mensaje de respuesta',
    example: 'Hemos revisado tu caso y estamos trabajando en una solución...',
  })
  @IsString()
  @MinLength(5, { message: 'La respuesta debe tener al menos 5 caracteres' })
  message: string;
}
