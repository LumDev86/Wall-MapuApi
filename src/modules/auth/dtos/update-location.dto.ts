import { IsString, MaxLength, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

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

  @ApiPropertyOptional({
    example: 'Av. Corrientes 1234',
    description: 'Domicilio del usuario',
  })
  @IsString({ message: 'El domicilio debe ser un texto' })
  @IsOptional()
  @MaxLength(255, { message: 'El domicilio no puede tener más de 255 caracteres' })
  address?: string;

  @ApiProperty({
    example: -34.6037,
    description: 'Latitud del usuario (REQUERIDA desde frontend)',
  })
  @IsNumber({}, { message: 'La latitud debe ser un número válido' })
  @Transform(({ value }) => parseFloat(value))
  latitude: number;

  @ApiProperty({
    example: -58.3816,
    description: 'Longitud del usuario (REQUERIDA desde frontend)',
  })
  @IsNumber({}, { message: 'La longitud debe ser un número válido' })
  @Transform(({ value }) => parseFloat(value))
  longitude: number;
}
