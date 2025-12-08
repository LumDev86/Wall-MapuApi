import { IsString, IsEnum, IsOptional, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetType, PetGender } from '../entities/pet.entity';

export class PetDto {
  @ApiProperty({
    example: '1701234567890',
    description: 'ID único de la mascota (generado en frontend)',
  })
  @IsString({ message: 'El ID debe ser un texto' })
  id: string;

  @ApiProperty({
    enum: PetType,
    example: PetType.DOG,
    description: 'Tipo de mascota',
  })
  @IsEnum(PetType, { message: 'El tipo debe ser: dog, cat u other' })
  type: PetType;

  @ApiProperty({
    example: 'Rocky',
    description: 'Nombre de la mascota',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  name: string;

  @ApiPropertyOptional({
    example: 'Labrador',
    description: 'Raza de la mascota',
  })
  @IsString({ message: 'La raza debe ser un texto' })
  @IsOptional()
  @MaxLength(100, { message: 'La raza no puede tener más de 100 caracteres' })
  breed?: string;

  @ApiPropertyOptional({
    example: '3 años',
    description: 'Edad de la mascota',
  })
  @IsString({ message: 'La edad debe ser un texto' })
  @IsOptional()
  @MaxLength(50, { message: 'La edad no puede tener más de 50 caracteres' })
  age?: string;

  @ApiPropertyOptional({
    example: '2020-05-15T00:00:00.000Z',
    description: 'Fecha de nacimiento de la mascota',
  })
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida' })
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({
    enum: PetGender,
    example: PetGender.MALE,
    description: 'Sexo de la mascota',
  })
  @IsEnum(PetGender, { message: 'El sexo debe ser: male o female' })
  @IsOptional()
  gender?: PetGender;
}
