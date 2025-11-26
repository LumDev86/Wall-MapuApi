// ============================================
// 🆕 retry-payment-response.dto.ts (NUEVO)
// ============================================
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus } from '../entities/subscription.entity';

export class RetryPaymentResponseDto {
  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Nueva preferencia de pago generada. Procede al pago.',
  })
  message: string;

  @ApiProperty({
    description: 'Datos de la suscripción con nuevo link de pago',
  })
  subscription: {
    id: string;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
    amount: number;
    startDate: Date;
    endDate: Date;
    initPoint: string;
    attemptsRemaining: number;
  };
}