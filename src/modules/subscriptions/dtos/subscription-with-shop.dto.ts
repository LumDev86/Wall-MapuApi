import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionResponseDto } from './subscription-response.dto';

export class SubscriptionWithShopDto {
  @ApiProperty({
    description: 'Datos de la suscripción',
    type: SubscriptionResponseDto,
  })
  subscription: SubscriptionResponseDto;

  @ApiProperty({
    description: 'Días hasta la expiración',
    example: 15,
  })
  daysUntilExpiration: number;

  @ApiProperty({
    description: 'Indica si puede reintentar el pago',
    example: false,
  })
  canRetryPayment: boolean;

  @ApiPropertyOptional({
    description: 'Intentos de pago restantes (solo si canRetryPayment es true)',
    example: 3,
  })
  attemptsRemaining?: number;
}