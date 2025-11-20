import { IsString, MinLength, MaxLength, Matches, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f6...',
    description: 'Token de recuperación recibido por email',
  })
  @IsString({ message: 'El token debe ser un texto' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token: string;

  @ApiProperty({
    example: 'NuevaPassword123!',
    description: 'Nueva contraseña segura (mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial)',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { 
      message: 'La contraseña debe contener al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&)' 
    }
  )
  newPassword: string;
}