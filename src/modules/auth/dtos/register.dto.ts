import { 
  IsEmail, 
  IsString, 
  MinLength, 
  MaxLength, 
  IsOptional, 
  IsEnum, 
  Matches, 
  IsPhoneNumber,
  IsNotEmpty
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email válido del usuario',
    uniqueItems: true,
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(100, { message: 'El email no puede tener más de 100 caracteres' })
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña segura (mínimo 8 caracteres, 1 mayúscula, 1 número, 1 carácter especial)',
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
  password: string;

  @ApiPropertyOptional({
    example: 'Juan Carlos Pérez',
    description: 'Nombre completo del usuario (máximo 100 caracteres)',
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no puede tener más de 100 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, { 
    message: 'El nombre solo puede contener letras y espacios' 
  })
  name?: string;

  @ApiPropertyOptional({
    example: '+5491112345678',
    description: 'Número de teléfono con código de país',
  })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'El teléfono debe tener formato internacional: +5491112345678'
  })
  phone?: string;

  @ApiPropertyOptional({
    enum: UserRole, 
    example: "client || retailer || wholesaler || admin",
    description: 'Rol del usuario en la plataforma',
    default: UserRole.CLIENT,
  })
  @IsEnum(UserRole, { message: 'El rol debe ser CLIENT, RETAILER o ADMIN' })
  @IsOptional()
  role?: UserRole;
}