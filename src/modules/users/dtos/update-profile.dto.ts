import {
  IsString,
  IsEnum,
  IsBoolean,
  IsArray,
  IsOptional,
  MaxLength,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserGender } from '../entities/user.entity';
import { PetDto } from './pet.dto';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: '1990-05-15T00:00:00.000Z',
    description: 'Fecha de nacimiento del usuario',
  })
  @IsDateString({}, { message: 'La fecha de nacimiento debe ser una fecha válida' })
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({
    enum: UserGender,
    example: UserGender.MALE,
    description: 'Género del usuario',
  })
  @IsEnum(UserGender, { message: 'El género debe ser: female, male u other' })
  @IsOptional()
  gender?: UserGender;

  @ApiPropertyOptional({
    example: 'Palermo',
    description: 'Barrio o zona del usuario',
  })
  @IsString({ message: 'El barrio debe ser un texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El barrio no puede tener más de 100 caracteres' })
  barrio?: string;

  @ApiPropertyOptional({
    example: true,
    description: '¿Tiene perros?',
  })
  @IsBoolean({ message: 'hasDogs debe ser un valor booleano' })
  @IsOptional()
  hasDogs?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: '¿Tiene gatos?',
  })
  @IsBoolean({ message: 'hasCats debe ser un valor booleano' })
  @IsOptional()
  hasCats?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: '¿Tiene otras mascotas?',
  })
  @IsBoolean({ message: 'hasOtherPets debe ser un valor booleano' })
  @IsOptional()
  hasOtherPets?: boolean;

  @ApiPropertyOptional({
    type: [PetDto],
    description: 'Lista de mascotas del usuario',
  })
  @IsArray({ message: 'pets debe ser un arreglo' })
  @ValidateNested({ each: true })
  @Type(() => PetDto)
  @IsOptional()
  pets?: PetDto[];
}
