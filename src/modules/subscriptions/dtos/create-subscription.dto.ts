import { IsEnum, IsOptional, IsBoolean, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubscriptionPlan } from '../entities/subscription.entity';
import { CardPaymentDto } from './card-payment.dto';

export class CreateSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.RETAILER,
    description: 'Plan de suscripción: retailer ($5000) o wholesaler ($8000)',
  })
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @ApiProperty({
    example: 'uuid-del-shop',
    description: 'ID del shop a vincular (opcional, puede vincularse después)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiProperty({
    example: true,
    description: 'Renovación automática mensual',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiProperty({
    type: CardPaymentDto,
    description: 'Datos de la tarjeta para el pago',
  })
  @ValidateNested()
  @Type(() => CardPaymentDto)
  cardPayment: CardPaymentDto;
}
