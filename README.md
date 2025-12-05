# PetShops API

API REST para plataforma de marketplace de tiendas de mascotas, construida con NestJS, TypeORM y PostgreSQL.

## Descripción

PetShops API es una plataforma completa que conecta minoristas, mayoristas y clientes en el ecosistema de productos para mascotas. Permite a los comerciantes gestionar sus tiendas y productos, mientras que los clientes pueden buscar productos cercanos geográficamente, dejar reseñas y gestionar sus compras.

## Características Principales

- **Gestión de Tiendas (Shops)**: Registro y administración de tiendas minoristas y mayoristas
- **Catálogo de Productos**: CRUD completo con búsqueda, filtros y categorización
- **Sistema de Categorías**: Categorías jerárquicas (padre/hijo) con iconos personalizables
- **Búsqueda Geoespacial**: Búsqueda de tiendas por proximidad usando PostGIS
- **Sistema de Usuarios**: Autenticación JWT con roles (Admin, Retailer, Wholesaler, Client)
- **Reviews y Ratings**: Sistema de reseñas para tiendas
- **Suscripciones**: Planes premium con integración de Mercado Pago
- **Caché Redis**: Optimización de rendimiento con caché distribuido
- **Upload de Imágenes**: Integración con Cloudinary
- **Emails Transaccionales**: Sistema de notificaciones por email con Resend
- **Documentación Swagger**: API totalmente documentada

## Tecnologías

- **Framework**: NestJS 11.1.9
- **Base de datos**: PostgreSQL con TypeORM
- **Autenticación**: JWT con Passport
- **Caché**: Redis
- **Storage**: Cloudinary
- **Pagos**: Mercado Pago
- **Email**: Resend + Nodemailer
- **Geolocalización**: PostGIS (extensiones cube y earthdistance)
- **Validación**: class-validator y class-transformer
- **Documentación**: Swagger/OpenAPI

## Requisitos Previos

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd petshops-api
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (ver sección siguiente)

4. Configurar extensiones de PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
```
Ver [docs/POSTGRES_SETUP.md](./docs/POSTGRES_SETUP.md) para más detalles.

5. Ejecutar migraciones:
```bash
npm run migration:run
```

## Configuración

Crear archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database (Supabase)
DB_HOST=your-supabase-db.supabase.co
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_NAME=postgres

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google Geocoding API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=your-mp-access-token
MERCADOPAGO_PUBLIC_KEY=your-mp-public-key

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@yourdomain.com

# URLs
FRONTEND_URL=http://localhost:3001
API_URL=http://localhost:3000
```

## Ejecución

### Desarrollo
```bash
npm run start:dev
```

### Producción
```bash
npm run build
npm run start:prod
```

### Otros comandos
```bash
# Ejecutar tests
npm run test

# Tests e2e
npm run test:e2e

# Cobertura de tests
npm run test:cov

# Linter
npm run lint

# Formatear código
npm run format
```

## Estructura del Proyecto

```
petshops-api/
├── src/
│   ├── modules/
│   │   ├── admin/           # Gestión administrativa
│   │   ├── auth/            # Autenticación y autorización
│   │   ├── categories/      # Categorías de productos
│   │   ├── products/        # Gestión de productos
│   │   ├── reviews/         # Reseñas de tiendas
│   │   ├── shops/           # Gestión de tiendas
│   │   ├── subscriptions/   # Planes y suscripciones
│   │   └── users/           # Gestión de usuarios
│   ├── common/
│   │   ├── decorators/      # Decoradores personalizados
│   │   ├── guards/          # Guards de autenticación/autorización
│   │   ├── interceptors/    # Interceptores HTTP
│   │   ├── pipes/           # Pipes de validación
│   │   ├── redis/           # Servicio Redis
│   │   └── services/        # Servicios compartidos
│   ├── config/              # Configuración de la app
│   ├── migrations/          # Migraciones de base de datos
│   ├── app.module.ts
│   └── main.ts
├── docs/                    # Documentación adicional
├── test/                    # Tests e2e
└── package.json
```

## API Endpoints

La API está documentada con Swagger. Una vez iniciado el servidor, acceder a:

```
http://localhost:3000/api/docs
```

### Principales grupos de endpoints:

#### Auth (`/api/auth`)
- `POST /register` - Registro de usuarios
- `POST /login` - Login
- `POST /verify-email` - Verificación de email
- `POST /forgot-password` - Recuperación de contraseña
- `POST /reset-password` - Restablecer contraseña

#### Users (`/api/users`)
- `GET /profile` - Obtener perfil
- `PATCH /profile` - Actualizar perfil
- `DELETE /account` - Eliminar cuenta

#### Shops (`/api/shops`)
- `POST /` - Crear tienda (Retailer/Wholesaler)
- `GET /` - Listar tiendas (con filtros geoespaciales)
- `GET /my-shop` - Obtener mi tienda
- `GET /:id` - Detalle de tienda
- `PATCH /:id` - Actualizar tienda
- `DELETE /:id` - Eliminar tienda

#### Products (`/api/products`)
- `POST /` - Crear producto
- `GET /` - Listar productos (paginado)
- `GET /search` - Buscar productos
- `GET /shop/:shopId` - Productos de una tienda
- `GET /:id` - Detalle de producto
- `PATCH /:id` - Actualizar producto
- `DELETE /:id` - Eliminar producto

#### Categories (`/api/categories`)
- `POST /` - Crear categoría (Admin)
- `GET /` - Listar categorías
- `GET /:id` - Detalle de categoría
- `GET /:id/products` - Productos de una categoría
- `PATCH /:id` - Actualizar categoría
- `DELETE /:id` - Eliminar categoría (soft delete)

#### Reviews (`/api/reviews`)
- `POST /` - Crear reseña
- `GET /shop/:shopId` - Reseñas de una tienda
- `PATCH /:id` - Actualizar reseña
- `DELETE /:id` - Eliminar reseña

#### Subscriptions (`/api/subscriptions`)
- `POST /create` - Crear suscripción
- `GET /` - Listar todas (Admin)
- `GET /history` - Historial de usuario
- `GET /active` - Suscripción activa
- `POST /cancel` - Cancelar suscripción
- `POST /webhook` - Webhook de Mercado Pago

#### Admin (`/api/admin`)
- `GET /users` - Listar usuarios
- `PATCH /users/:id/role` - Cambiar rol
- `DELETE /users/:id` - Eliminar usuario

## Modelos de Datos

### User
```typescript
{
  id: string (UUID)
  email: string (unique)
  password: string (hashed)
  name: string
  phone?: string
  province?: string
  city?: string
  address?: string
  latitude?: number
  longitude?: number
  role: UserRole (admin | retailer | wholesaler | client)
  isEmailVerified: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Shop
```typescript
{
  id: string (UUID)
  name: string
  description?: string
  address: string
  province?: string
  city?: string
  latitude: number
  longitude: number
  type: ShopType (retailer | wholesaler)
  status: ShopStatus (pending_payment | active | suspended)
  phone?: string
  email?: string
  website?: string
  schedule?: JSON
  logo?: string
  banner?: string
  isActive: boolean
  owner: User
  products: Product[]
  reviews: Review[]
}
```

### Product
```typescript
{
  id: string (UUID)
  name: string
  description?: string
  priceRetail: number
  priceWholesale?: number
  stock: number
  sku?: string
  barcode?: string
  brand?: string
  characteristics?: JSON
  images: string[]
  isActive: boolean
  shop: Shop
  category: Category
  createdAt: Date
  updatedAt: Date
}
```

### Category
```typescript
{
  id: string (UUID)
  name: string
  description?: string
  icon?: string
  order: number
  isActive: boolean
  parent?: Category
  subcategories: Category[]
  products: Product[]
}
```

### Review
```typescript
{
  id: string (UUID)
  rating: number (1-5)
  comment?: string
  user: User
  shop: Shop
  createdAt: Date
  updatedAt: Date
}
```

### Subscription
```typescript
{
  id: string (UUID)
  plan: SubscriptionPlan (basic | premium)
  status: SubscriptionStatus (pending | active | cancelled | expired)
  startDate?: Date
  endDate?: Date
  price: number
  mercadoPagoId?: string
  user: User
  createdAt: Date
  updatedAt: Date
}
```

## Caché con Redis

La API implementa estrategias de caché para optimizar el rendimiento:

- **Categorías**: TTL 600s (10 minutos)
- **Productos**: TTL 60s (1 minuto)
- **Shops por ubicación**: Invalidación al crear/actualizar
- **Invalidación automática**: Al crear, actualizar o eliminar recursos

## Optimizaciones

- **Sin Eager Loading**: Eliminado de todas las relaciones para mejorar performance
- **DTOs de Respuesta**: Control preciso de datos retornados
- **Paginación Estandarizada**: Formato consistente en todos los endpoints
- **Índices de Base de Datos**: Optimización de queries frecuentes
- **Caché Distribuido**: Redis para reducir carga en BD

## Seguridad

- Contraseñas hasheadas con bcrypt
- Autenticación JWT
- Guards de autorización por rol
- Validación de DTOs con class-validator
- Variables sensibles en .env (no versionadas)
- CORS configurado
- Rate limiting (próximamente)

## Migraciones

### Crear una migración
```bash
npm run migration:generate -- src/migrations/NombreMigracion
```

### Ejecutar migraciones
```bash
npm run migration:run
```

### Revertir última migración
```bash
npm run migration:revert
```

### Ver migraciones
```bash
npm run migration:show
```

## Deployment

### Railway
El proyecto está configurado para deploy en Railway. Ver `railway.toml` para configuración.

### Docker
```bash
docker build -t petshops-api .
docker run -p 3000:3000 --env-file .env petshops-api
```

## Documentación Adicional

- [Configuración PostgreSQL](./docs/POSTGRES_SETUP.md)

## Próximas Mejoras

- [ ] Rate limiting
- [ ] Tests unitarios y e2e completos
- [ ] Sistema de notificaciones push
- [ ] Chat entre usuarios
- [ ] Estadísticas y analytics para tiendas
- [ ] Sistema de favoritos
- [ ] Carrito de compras y checkout
- [ ] Integración con más pasarelas de pago

## Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Este proyecto es privado y no tiene licencia de código abierto.

## Contacto

Para consultas o soporte, contactar al equipo de desarrollo.

---

Desarrollado con NestJS
