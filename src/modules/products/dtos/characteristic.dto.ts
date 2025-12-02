import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CharacteristicDto {
  @ApiProperty({
    example: 'Color',
    description: 'Nombre de la característica',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  name: string;

  @ApiProperty({
    example: 'Rojo',
    description: 'Valor de la característica',
  })
  @IsString({ message: 'El valor debe ser un texto' })
  @IsNotEmpty({ message: 'El valor es obligatorio' })
  @MaxLength(255, { message: 'El valor no puede tener más de 255 caracteres' })
  value: string;
}
