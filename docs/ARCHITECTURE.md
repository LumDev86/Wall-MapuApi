# Arquitectura del Proyecto

## Visión General

PetShops API está construida siguiendo una arquitectura modular basada en el framework NestJS, utilizando los principios de **Clean Architecture** y **Domain-Driven Design (DDD)**. Cada módulo encapsula su propia lógica de negocio, controladores, servicios y entidades.

## Capas de la Aplicación

```
┌─────────────────────────────────────────┐
│         Controllers (HTTP)              │
│  - Validación de entrada                │
│  - Gestión de respuestas HTTP           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Services (Business Logic)       │
│  - Lógica de negocio                    │
│  - Orquestación de operaciones          │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Repositories (Data Access)      │
│  - TypeORM Repositories                 │
│  - Queries y persistencia               │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)           │
└─────────────────────────────────────────┘
```

## Estructura de Módulos

Cada módulo sigue esta estructura:

```
module/
├── controllers/
│   └── module.controller.ts      # Endpoints HTTP
├── services/
│   └── module.service.ts         # Lógica de negocio
├── entities/
│   └── module.entity.ts          # Modelo de datos TypeORM
├── dtos/
│   ├── create-module.dto.ts      # DTO para creación
│   ├── update-module.dto.ts      # DTO para actualización
│   ├── filter-module.dto.ts      # DTO para filtros
│   └── module-response.dto.ts    # DTO para respuestas
├── guards/
│   └── module.guard.ts           # Guards específicos
└── module.module.ts              # Configuración del módulo
```

## Módulos Principales

### 1. Auth Module
**Responsabilidad**: Autenticación y autorización

- Registro de usuarios
- Login con JWT
- Verificación de email
- Recuperación de contraseña
- Guards de autenticación

**Dependencias**:
- Users Module
- JWT Module
- Passport

### 2. Users Module
**Responsabilidad**: Gestión de usuarios

- CRUD de usuarios
- Gestión de perfiles
- Roles y permisos
- Relaciones con otros módulos

**Roles**:
- `admin`: Acceso total al sistema
- `retailer`: Dueño de tienda minorista
- `wholesaler`: Dueño de tienda mayorista
- `client`: Cliente final

### 3. Shops Module
**Responsabilidad**: Gestión de tiendas

- Registro de tiendas (retailer/wholesaler)
- Búsqueda geoespacial
- Horarios de atención
- Upload de logo y banner
- Geocodificación automática

**Características especiales**:
- PostGIS para búsqueda por proximidad
- Validación de direcciones con Google Maps API
- Caché por ubicación

### 4. Products Module
**Responsabilidad**: Catálogo de productos

- CRUD de productos
- Búsqueda y filtros
- Gestión de stock
- Upload de múltiples imágenes
- Precios mayorista/minorista

**Optimizaciones**:
- Caché de listados
- Paginación eficiente
- Índices en campos de búsqueda

### 5. Categories Module
**Responsabilidad**: Categorización de productos

- Categorías jerárquicas (2 niveles)
- Iconos personalizables
- Ordenamiento manual
- Soft delete

**Estructura**:
```
Categoría Padre
├── Subcategoría 1
├── Subcategoría 2
└── Subcategoría 3
```

### 6. Reviews Module
**Responsabilidad**: Sistema de reseñas

- Calificaciones (1-5 estrellas)
- Comentarios
- Rating promedio por tienda
- Validación: 1 review por usuario/tienda

### 7. Subscriptions Module
**Responsabilidad**: Planes y pagos

- Planes Basic/Premium
- Integración con Mercado Pago
- Webhook para confirmación de pagos
- Gestión de estados (pending, active, cancelled, expired)

### 8. Admin Module
**Responsabilidad**: Administración del sistema

- Gestión de usuarios
- Cambio de roles
- Moderación de contenido
- Estadísticas del sistema

## Servicios Compartidos (Common)

### CloudinaryService
**Propósito**: Upload y gestión de imágenes

```typescript
uploadImage(file: Express.Multer.File, folder: string): Promise<UploadResult>
deleteImage(publicId: string): Promise<void>
```

### GeocodingService
**Propósito**: Geocodificación de direcciones

```typescript
geocodeAddress(address: string, city: string, province: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
}>
```

### RedisService
**Propósito**: Caché distribuido

```typescript
get(key: string): Promise<string | null>
set(key: string, value: string, ttl?: number): Promise<void>
del(key: string): Promise<void>
getJSON<T>(key: string): Promise<T | null>
setJSON<T>(key: string, value: T, ttl?: number): Promise<void>
deleteKeysByPattern(pattern: string): Promise<void>
```

### EmailService
**Propósito**: Envío de emails transaccionales

```typescript
sendVerificationEmail(email: string, token: string): Promise<void>
sendPasswordResetEmail(email: string, token: string): Promise<void>
sendWelcomeEmail(email: string, name: string): Promise<void>
```

## Guards

### JwtAuthGuard
Verifica que el usuario esté autenticado con un JWT válido.

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### RolesGuard
Verifica que el usuario tenga el rol requerido.

```typescript
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin-only')
adminEndpoint() {
  return 'Admin content';
}
```

### OptionalAuthGuard
Permite acceso con o sin autenticación, útil para endpoints públicos que cambian comportamiento según el usuario.

```typescript
@UseGuards(OptionalAuthGuard)
@Get('shops')
findAll(@OptionalUser() user: User | null) {
  // Lógica diferente según si user existe o no
}
```

## Decoradores Personalizados

### @CurrentUser()
Extrae el usuario actual del request.

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### @Roles()
Define roles permitidos para un endpoint.

```typescript
@Roles(UserRole.ADMIN, UserRole.RETAILER)
@Get('protected')
protectedEndpoint() {
  return 'Protected content';
}
```

### @OptionalUser()
Obtiene el usuario si está autenticado, null si no lo está.

```typescript
@Get('public')
publicEndpoint(@OptionalUser() user: User | null) {
  if (user) {
    // Lógica para usuarios autenticados
  } else {
    // Lógica para usuarios anónimos
  }
}
```

## DTOs y Validación

### DTOs de Entrada
Validan datos de entrada usando `class-validator`:

```typescript
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  priceRetail: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceWholesale?: number;
}
```

### DTOs de Respuesta
Controlan exactamente qué datos se retornan:

```typescript
export class ProductResponseDto {
  id: string;
  name: string;
  priceRetail: number;
  shop: ShopBasicDto;
  category: CategoryBasicDto;

  static fromEntity(product: Product): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      priceRetail: product.priceRetail,
      shop: ShopBasicDto.fromEntity(product.shop),
      category: CategoryBasicDto.fromEntity(product.category),
    };
  }
}
```

## Estrategia de Caché

### Niveles de Caché

1. **Caché de Entidades** (TTL: 5-10 minutos)
   - Categorías: 600s
   - Productos individuales: 300s
   - Shops individuales: 300s

2. **Caché de Listados** (TTL: 1-2 minutos)
   - Listado de productos: 60s
   - Productos por categoría: 60s
   - Búsquedas frecuentes: 120s

3. **Caché de Búsquedas Geoespaciales** (TTL: 5 minutos)
   - Shops por ubicación: 300s

### Invalidación de Caché

La caché se invalida automáticamente en operaciones de escritura:

```typescript
// Después de crear/actualizar/eliminar
await this.redisService.del(`product:${id}`);
await this.redisService.deleteKeysByPattern('products:*');
```

## Base de Datos

### Estrategia de Relaciones

**Sin Eager Loading**: Todas las relaciones se cargan explícitamente cuando es necesario.

```typescript
// ❌ Evitamos esto
@ManyToOne(() => Shop, { eager: true })
shop: Shop;

// ✅ Hacemos esto
@ManyToOne(() => Shop)
shop: Shop;

// Y cargamos explícitamente
const product = await this.productRepository.findOne({
  where: { id },
  relations: ['shop', 'category']
});
```

### Migraciones

Las migraciones gestionan cambios en el esquema:

```bash
# Generar migración
npm run migration:generate -- src/migrations/AddNewColumn

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert
```

### Extensiones PostgreSQL

```sql
-- Para búsquedas geoespaciales
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
```

## Seguridad

### 1. Autenticación
- JWT con tiempo de expiración configurable
- Tokens almacenados solo en memoria del cliente
- Refresh tokens (próximamente)

### 2. Autorización
- Guards basados en roles
- Verificación a nivel de controlador y servicio
- Ownership verification (los usuarios solo pueden modificar sus propios recursos)

### 3. Validación
- DTOs con class-validator
- Sanitización de inputs
- Validación de tipos y formatos

### 4. Protección de Datos Sensibles
- Passwords hasheados con bcrypt (10 rounds)
- Exclusión de campos sensibles en respuestas
- Variables de entorno para secretos

### 5. Rate Limiting (Próximamente)
```typescript
@UseGuards(ThrottlerGuard)
@Throttle(10, 60) // 10 requests por minuto
@Post('login')
login() { ... }
```

## Manejo de Errores

### Excepciones HTTP Personalizadas

```typescript
throw new NotFoundException('Producto no encontrado');
throw new BadRequestException('Datos inválidos');
throw new ForbiddenException('No tienes permiso');
throw new UnauthorizedException('Debes iniciar sesión');
```

### Interceptor de Errores

Transforma errores en respuestas HTTP consistentes:

```json
{
  "statusCode": 404,
  "message": "Producto no encontrado",
  "timestamp": "2024-12-05T10:30:00.000Z",
  "path": "/api/products/123"
}
```

## Performance

### Optimizaciones Implementadas

1. **Caché Redis**: Reduce queries a BD
2. **Paginación**: Limita cantidad de datos transferidos
3. **DTOs de Respuesta**: Solo datos necesarios
4. **Índices de BD**: En campos frecuentemente consultados
5. **Lazy Loading**: Relaciones cargadas bajo demanda
6. **Connection Pooling**: Pool de conexiones a BD

### Métricas Objetivo

- Response time < 200ms (endpoints simples)
- Response time < 500ms (endpoints con geolocalización)
- Throughput > 1000 req/s
- Cache hit rate > 80%

## Testing

### Estructura de Tests

```
test/
├── unit/
│   ├── products.service.spec.ts
│   ├── shops.service.spec.ts
│   └── ...
├── integration/
│   ├── products.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   └── ...
└── jest-e2e.json
```

### Ejecutar Tests

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Cobertura
npm run test:cov
```

## Deployment

### Variables de Entorno Requeridas

Ver [README.md](../README.md#configuración) para lista completa.

### Railway Deployment

```yaml
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  startCommand = "npm run start:prod"
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 10
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

## Próximas Mejoras Arquitecturales

- [ ] Event-driven architecture con Bull queues
- [ ] CQRS pattern para operaciones complejas
- [ ] GraphQL API (junto a REST)
- [ ] WebSockets para notificaciones en tiempo real
- [ ] Microservicios para módulos independientes
- [ ] Service mesh con Istio
- [ ] Distributed tracing con OpenTelemetry

---

**Última actualización**: Diciembre 2024
