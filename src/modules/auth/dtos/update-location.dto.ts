import { IsString, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLocationDto {
  @ApiPropertyOptional({
    example: 'Buenos Aires',
    description: 'Provincia del usuario',
  })
  @IsString({ message: 'La provincia debe ser un texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La provincia no puede tener más de 100 caracteres' })
  province?: string;

  @ApiPropertyOptional({
    example: 'Ciudad Autónoma de Buenos Aires',
    description: 'Ciudad del usuario',
  })
  @IsString({ message: 'La ciudad debe ser un texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La ciudad no puede tener más de 100 caracteres' })
  city?: string;

  @ApiProperty({
    example: 'Av. Corrientes 1234',
    description: 'Domicilio del usuario',
  })
  @IsString({ message: 'El domicilio debe ser un texto' })
  @MaxLength(255, { message: 'El domicilio no puede tener más de 255 caracteres' })
  address: string;
}
