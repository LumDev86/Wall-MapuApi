// ============================================
// subscription-response.dto.ts (ACTUALIZADO)
// ============================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus } from '../entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty({
    description: 'ID de la suscripción',
    example: 'uuid-de-subscription',
  })
  id: string;

  @ApiProperty({
    enum: SubscriptionPlan,
    description: 'Plan de suscripción',
    example: SubscriptionPlan.RETAILER,
  })
  plan: SubscriptionPlan;

  @ApiProperty({
    enum: SubscriptionStatus,
    description: 'Estado de la suscripción',
    example: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Fecha de inicio',
    example: '2024-01-01T00:00:00.000Z',
  })
  startDate: Date;

  @ApiProperty({
    description: 'Fecha de vencimiento',
    example: '2024-02-01T00:00:00.000Z',
  })
  endDate: Date;

  @ApiProperty({
    description: 'Monto de la suscripción',
    example: 5000,
  })
  amount: number;

  @ApiProperty({
    description: 'Renovación automática habilitada',
    example: true,
  })
  autoRenew: boolean;

  @ApiPropertyOptional({
    description: 'Fecha del último pago exitoso',
    example: '2024-01-01T10:30:00.000Z',
  })
  lastPaymentDate?: Date;

  @ApiPropertyOptional({
    description: 'Fecha del próximo pago programado',
    example: '2024-02-01T00:00:00.000Z',
  })
  nextPaymentDate?: Date;

  @ApiProperty({
    description: 'ID del shop asociado',
    example: 'uuid-del-shop',
  })
  shopId: string;

  @ApiPropertyOptional({
    description: 'URL de pago de Mercado Pago (initPoint)',
    example: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123456',
  })
  initPoint?: string;

  // 🆕 Nuevos campos para manejo de reintentos
  @ApiPropertyOptional({
    description: 'Número de intentos de pago fallidos',
    example: 2,
    default: 0,
  })
  failedPaymentAttempts?: number;

  @ApiPropertyOptional({
    description: 'Indica si el usuario puede reintentar el pago',
    example: true,
  })
  canRetryPayment?: boolean;

  @ApiPropertyOptional({
    description: 'Intentos de pago restantes (máximo 5)',
    example: 3,
  })
  attemptsRemaining?: number;
}