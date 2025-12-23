# Implementación de Google Sign-In - Instrucciones

## Backend completado parcialmente

Ya se instaló `google-auth-library` y se creó el DTO `google-login.dto.ts`.

## Cambios pendientes en `auth.service.ts`:

### 1. Agregar imports (después de la línea 17):
```typescript
import { GoogleLoginDto } from './dtos/google-login.dto';
import { OAuth2Client } from 'google-auth-library';
```

### 2. Agregar propiedad googleClient a la clase (después de la línea 24):
```typescript
private googleClient: OAuth2Client;
```

### 3. Modificar el constructor (reemplazar líneas 24-30):
```typescript
constructor(
  @InjectRepository(User)
  private userRepository: Repository<User>,
  private jwtService: JwtService,
  private readonly mailService: MailService,
  private readonly geocodingService: GeocodingService,
) {
  this.googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
  );
}
```

### 4. Agregar método loginWithGoogle (después del método login, línea 130):
```typescript
async loginWithGoogle(googleLoginDto: GoogleLoginDto) {
  const { idToken } = googleLoginDto;

  try {
    // Verificar el token con Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    const { email, name } = payload;

    // Buscar si el usuario ya existe
    let user = await this.userRepository.findOne({
      where: { email },
    });

    if (user) {
      // Usuario existente - verificar que esté activo
      if (!user.isActive) {
        throw new UnauthorizedException('Usuario inactivo');
      }
    } else {
      // Crear nuevo usuario
      // Para usuarios de Google, generamos una contraseña aleatoria que nunca usarán
      const randomPassword = randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = this.userRepository.create({
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: UserRole.CLIENT,
        isEmailVerified: true, // Google ya verificó el email
      });

      await this.userRepository.save(user);
    }

    const token = this.generateToken(user);

    return {
      message: 'Login con Google exitoso',
      user: this.sanitizeUser(user),
      token,
    };
  } catch (error) {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    console.error('Error en Google login:', error);
    throw new UnauthorizedException('Error al validar token de Google');
  }
}
```

## Siguiente paso: AuthController

Agregar endpoint en `auth.controller.ts`:
```typescript
@Post('google')
async loginWithGoogle(@Body() googleLoginDto: GoogleLoginDto) {
  return this.authService.loginWithGoogle(googleLoginDto);
}
```

## Variable de entorno requerida

Agregar a `.env`:
```
GOOGLE_CLIENT_ID=855339673822-bct96b5jvi1tiau9t71rghckmo382sgb.apps.googleusercontent.com
```
