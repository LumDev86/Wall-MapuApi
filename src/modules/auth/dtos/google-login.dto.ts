import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID Token obtenido del frontend',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjU5MmU...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
