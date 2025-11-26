// ============================================
// 🆕 subscription-stats.dto.ts (NUEVO)
// ============================================
import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionStatsDto {
  @ApiProperty({
    description: 'Total de suscripciones',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Suscripciones activas (pagadas)',
    example: 120,
  })
  active: number;

  @ApiProperty({
    description: 'Suscripciones expiradas',
    example: 10,
  })
  expired: number;

  @ApiProperty({
    description: 'Suscripciones pendientes de pago',
    example: 8,
  })
  pending: number;

  @ApiProperty({
    description: 'Suscripciones canceladas',
    example: 7,
  })
  cancelled: number;

  @ApiProperty({
    description: 'Suscripciones con pagos fallidos',
    example: 5,
  })
  failed: number;
}