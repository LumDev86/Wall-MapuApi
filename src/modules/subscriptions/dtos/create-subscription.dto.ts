import { IsEnum, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.RETAILER,
    description: 'Plan de suscripción',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({
    example: 'uuid-del-shop',
    description: 'ID del shop',
  })
  @IsUUID()
  shopId: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Renovación automática',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}