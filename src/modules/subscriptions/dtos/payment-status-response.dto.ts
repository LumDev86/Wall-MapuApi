// ============================================
// 🆕 payment-status-response.dto.ts (NUEVO)
// ============================================
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus } from '../entities/subscription.entity';

export class PaymentStatusResponseDto {
  @ApiProperty({
    description: 'ID de la suscripción',
    example: 'uuid-de-subscription',
  })
  subscriptionId: string;

  @ApiProperty({
    enum: SubscriptionStatus,
    description: 'Estado actual de la suscripción',
    example: SubscriptionStatus.PENDING,
  })
  status: SubscriptionStatus;

  @ApiProperty({
    enum: SubscriptionPlan,
    description: 'Plan de la suscripción',
    example: SubscriptionPlan.RETAILER,
  })
  plan: SubscriptionPlan;

  @ApiProperty({
    description: 'Monto a pagar',
    example: 5000,
  })
  amount: number;

  @ApiProperty({
    description: 'Indica si puede reintentar el pago',
    example: true,
  })
  canRetryPayment: boolean;

  @ApiProperty({
    description: 'Número de intentos fallidos',
    example: 2,
  })
  failedAttempts: number;

  @ApiProperty({
    description: 'Intentos restantes antes de bloqueo',
    example: 3,
  })
  attemptsRemaining: number;

  @ApiPropertyOptional({
    description: 'Detalles del último intento de pago',
    example: {
      status: 'rejected',
      status_detail: 'cc_rejected_insufficient_amount',
      rejectedAt: '2024-01-15T12:00:00.000Z',
    },
  })
  paymentDetails?: any;
}