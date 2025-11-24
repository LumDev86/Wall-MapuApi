import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus } from '../entities/subscription.entity';

export class SubscriptionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  autoRenew: boolean;

  @ApiProperty({ required: false })
  lastPaymentDate?: Date;

  @ApiProperty({ required: false })
  nextPaymentDate?: Date;

  @ApiProperty()
  shopId: string;

  @ApiProperty({ required: false })
  initPoint?: string; // URL de pago de Mercado Pago
}