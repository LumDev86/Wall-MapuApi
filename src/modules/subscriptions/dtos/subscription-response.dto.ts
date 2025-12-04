import { ApiProperty } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  SubscriptionStatus,
} from '../entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  autoRenew: boolean;

  @ApiProperty({
    example: 'https://www.mercadopago.com.ar/checkout/v1/...'
  })
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
