import { IsString, IsNumber, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CardPaymentDto {
  @ApiProperty({
    example: '5031755734530604',
    description: 'Número de tarjeta (sin espacios)',
  })
  @IsString()
  @Length(13, 19)
  @Matches(/^[0-9]+$/, { message: 'El número de tarjeta debe contener solo dígitos' })
  cardNumber: string;

  @ApiProperty({
    example: 'APRO',
    description: 'Nombre del titular de la tarjeta',
  })
  @IsString()
  cardholderName: string;

  @ApiProperty({
    example: '12345678',
    description: 'DNI/Documento del titular',
  })
  @IsString()
  cardholderIdentification: string;

  @ApiProperty({
    example: '123',
    description: 'Código de seguridad CVV',
  })
  @IsString()
  @Length(3, 4)
  @Matches(/^[0-9]+$/, { message: 'CVV debe contener solo dígitos' })
  securityCode: string;

  @ApiProperty({
    example: 11,
    description: 'Mes de vencimiento (1-12)',
  })
  @IsNumber()
  expirationMonth: number;

  @ApiProperty({
    example: 30,
    description: 'Año de vencimiento (formato: 25 para 2025, 30 para 2030)',
  })
  @IsNumber()
  expirationYear: number;
}
