const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/modules/auth/auth.service.ts');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// 1. Agregar imports
if (!content.includes("import { GoogleLoginDto }")) {
  content = content.replace(
    "import { UpdateLocationDto } from './dtos/update-location.dto';",
    "import { UpdateLocationDto } from './dtos/update-location.dto';\nimport { GoogleLoginDto } from './dtos/google-login.dto';"
  );
  console.log('✅ Import GoogleLoginDto agregado');
}

if (!content.includes("import { OAuth2Client }")) {
  content = content.replace(
    "import { GeocodingService } from '../../common/services/geocoding.service';",
    "import { GeocodingService } from '../../common/services/geocoding.service';\nimport { OAuth2Client } from 'google-auth-library';"
  );
  console.log('✅ Import OAuth2Client agregado');
}

// 2. Agregar propiedad googleClient
if (!content.includes("private googleClient: OAuth2Client;")) {
  content = content.replace(
    "@Injectable()\nexport class AuthService {\n  constructor(",
    "@Injectable()\nexport class AuthService {\n  private googleClient: OAuth2Client;\n\n  constructor("
  );
  console.log('✅ Propiedad googleClient agregada');
}

// 3. Modificar constructor
if (!content.includes("this.googleClient = new OAuth2Client")) {
  content = content.replace(
    "    private readonly geocodingService: GeocodingService,\n  ) {}",
    `    private readonly geocodingService: GeocodingService,
  ) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
    );
  }`
  );
  console.log('✅ Constructor modificado');
}

// 4. Agregar método loginWithGoogle
if (!content.includes("async loginWithGoogle")) {
  // Método completo como string
  const lines = content.split('\n');

  // Buscar la línea que contiene el cierre del método login
  let insertIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '}' &&
        i > 0 && lines[i-1].includes('};') &&
        i > 1 && lines[i-2].includes('token,') &&
        i > 3 && lines[i-4].includes("message: 'Login exitoso'")) {
      insertIndex = i + 1;
      break;
    }
  }

  if (insertIndex > 0) {
    const googleMethod = [
      '',
      '  async loginWithGoogle(googleLoginDto: GoogleLoginDto) {',
      '    const { idToken } = googleLoginDto;',
      '',
      '    try {',
      '      // Verificar el token con Google',
      '      const ticket = await this.googleClient.verifyIdToken({',
      '        idToken,',
      '        audience: process.env.GOOGLE_CLIENT_ID,',
      '      });',
      '',
      '      const payload = ticket.getPayload();',
      '      if (!payload) {',
      "        throw new UnauthorizedException('Token de Google inválido');",
      '      }',
      '',
      '      const { email, name } = payload;',
      '',
      '      // Buscar si el usuario ya existe',
      '      let user = await this.userRepository.findOne({',
      '        where: { email },',
      '      });',
      '',
      '      if (user) {',
      '        // Usuario existente - verificar que esté activo',
      '        if (!user.isActive) {',
      "          throw new UnauthorizedException('Usuario inactivo');",
      '        }',
      '      } else {',
      '        // Crear nuevo usuario',
      '        // Para usuarios de Google, generamos una contraseña aleatoria que nunca usarán',
      '        const randomPassword = randomBytes(32).toString(\'hex\');',
      '        const hashedPassword = await bcrypt.hash(randomPassword, 10);',
      '',
      '        user = this.userRepository.create({',
      '          email,',
      '          password: hashedPassword,',
      '          name: name || email.split(\'@\')[0],',
      '          role: UserRole.CLIENT,',
      '          isEmailVerified: true, // Google ya verificó el email',
      '        });',
      '',
      '        await this.userRepository.save(user);',
      '      }',
      '',
      '      const token = this.generateToken(user);',
      '',
      '      return {',
      "        message: 'Login con Google exitoso',",
      '        user: this.sanitizeUser(user),',
      '        token,',
      '      };',
      '    } catch (error) {',
      '      if (error instanceof UnauthorizedException) {',
      '        throw error;',
      '      }',
      '      console.error(\'Error en Google login:\', error);',
      "      throw new UnauthorizedException('Error al validar token de Google');",
      '    }',
      '  }'
    ];

    lines.splice(insertIndex, 0, ...googleMethod);
    content = lines.join('\n');
    console.log('✅ Método loginWithGoogle agregado en línea', insertIndex);
  } else {
    console.log('❌ No se pudo encontrar el método login');
  }
}

// Escribir el archivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n✅ auth.service.ts actualizado exitosamente!');
