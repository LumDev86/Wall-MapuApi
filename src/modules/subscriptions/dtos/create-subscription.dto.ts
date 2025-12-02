// ============================================
// create-subscription.dto.ts
// ============================================
import { IsEnum, IsUUID, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan } from '../entities/subscription.entity';

export class CreateSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.RETAILER,
    description: 'Plan de suscripción (retailer o wholesaler)',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiPropertyOptional({
    example: 'uuid-del-shop',
    description: 'ID del shop (opcional - solo si ya tiene un shop creado)',
  })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Renovación automática',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}