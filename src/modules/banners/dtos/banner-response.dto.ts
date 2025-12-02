import { ApiProperty } from '@nestjs/swagger';
import { BannerStatus } from '../entities/banner.entity';

export class BannerResponseDto {
  @ApiProperty({ description: 'ID del banner' })
  id: string;

  @ApiProperty({ description: 'Título del banner' })
  title: string;

  @ApiProperty({ description: 'Descripción del banner' })
  description: string;

  @ApiProperty({ description: 'URL de la imagen del banner' })
  imageUrl: string;

  @ApiProperty({ enum: BannerStatus, description: 'Estado del banner' })
  status: BannerStatus;

  @ApiProperty({ description: 'Precio pagado por el banner' })
  price: number;

  @ApiProperty({ description: 'Link de pago de Mercado Pago', required: false })
  paymentLink?: string;

  @ApiProperty({ description: 'Mensaje informativo' })
  message: string;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ description: 'ID del banner' })
  bannerId: string;

  @ApiProperty({ enum: BannerStatus, description: 'Estado actual del banner' })
  status: BannerStatus;

  @ApiProperty({ description: 'Puede reintentar el pago' })
  canRetryPayment: boolean;

  @ApiProperty({ description: 'Intentos restantes' })
  attemptsRemaining: number;

  @ApiProperty({ description: 'Link de pago (si puede reintentar)', required: false })
  paymentLink?: string;
}

export class RetryPaymentResponseDto {
  @ApiProperty({ description: 'Mensaje' })
  message: string;

  @ApiProperty({ description: 'Link de pago de Mercado Pago' })
  paymentLink: string;

  @ApiProperty({ description: 'Intentos restantes' })
  attemptsRemaining: number;
}
