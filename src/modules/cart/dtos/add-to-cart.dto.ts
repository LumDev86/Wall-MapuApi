import { IsUUID, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class AddToCartDto {
  @ApiProperty({
    example: 'uuid-del-producto',
    description: 'ID del producto a agregar',
  })
  @IsUUID('4', { message: 'productId debe ser un UUID válido' })
  @Transform(({ value }) => value?.trim())
  productId: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Cantidad del producto (por defecto 1)',
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return 1;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? value : parsed;
  })
  @IsNumber()
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity?: number;
}
