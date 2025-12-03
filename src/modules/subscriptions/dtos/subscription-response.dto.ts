import { ApiProperty } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: true })
  autoRenew: boolean;

  @ApiProperty({ example: 'https://www.mercadopago.com.ar/checkout/...' })
  paymentLink: string;

  @ApiProperty()
  message: string;
}

export class PaymentStatusResponseDto {
  @ApiProperty()
  subscriptionId: string;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  canRetryPayment: boolean;

  @ApiProperty()
  attemptsRemaining: number;
}
