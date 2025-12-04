import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.RETAILER,
    description: 'Plan de suscripción elegido por el usuario',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Si la suscripción debe renovarse automáticamente',
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
