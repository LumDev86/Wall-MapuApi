# Modelos de Base de Datos

Esta documentación describe todos los modelos de datos (entidades) de la aplicación PetShops API.

---

## User

Representa a los usuarios del sistema con diferentes roles.

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único |
| `email` | String | Sí | Email único del usuario |
| `password` | String | Sí | Contraseña hasheada (bcrypt) |
| `name` | String | Sí | Nombre completo |
| `phone` | String | No | Teléfono de contacto |
| `province` | String | No | Provincia de residencia |
| `city` | String | No | Ciudad de residencia |
| `address` | String | No | Dirección completa |
| `latitude` | Number | No | Latitud de la ubicación |
| `longitude` | Number | No | Longitud de la ubicación |
| `role` | Enum | Sí | Rol del usuario |
| `isEmailVerified` | Boolean | Sí | Email verificado (default: false) |
| `isActive` | Boolean | Sí | Usuario activo (default: true) |
| `emailVerificationToken` | String | No | Token de verificación de email |
| `passwordResetToken` | String | No | Token de recuperación de contraseña |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `updatedAt` | Timestamp | Sí | Fecha de última actualización |

### Enum: UserRole

```typescript
enum UserRole {
  ADMIN = 'admin',
  RETAILER = 'retailer',
  WHOLESALER = 'wholesaler',
  CLIENT = 'client'
}
```

### Relaciones

- **shops**: Uno a muchos con `Shop` (como owner)
- **reviews**: Uno a muchos con `Review`
- **subscriptions**: Uno a muchos con `Subscription`

### Índices

- `email` (UNIQUE)
- `emailVerificationToken`
- `passwordResetToken`

### Ejemplo

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "juan@example.com",
  "name": "Juan Pérez",
  "phone": "+54 9 11 1234-5678",
  "province": "Buenos Aires",
  "city": "CABA",
  "address": "Av. Corrientes 1234",
  "latitude": -34.6037,
  "longitude": -58.3816,
  "role": "client",
  "isEmailVerified": true,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Shop

Representa una tienda de mascotas (minorista o mayorista).

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único |
| `name` | String | Sí | Nombre de la tienda |
| `description` | Text | No | Descripción de la tienda |
| `address` | String | Sí | Dirección física |
| `province` | String | No | Provincia |
| `city` | String | No | Ciudad |
| `latitude` | Decimal | Sí | Latitud (PostGIS) |
| `longitude` | Decimal | Sí | Longitud (PostGIS) |
| `type` | Enum | Sí | Tipo de tienda |
| `status` | Enum | Sí | Estado de la tienda |
| `phone` | String | No | Teléfono |
| `email` | String | No | Email de contacto |
| `website` | String | No | Sitio web |
| `schedule` | JSON | No | Horarios de atención |
| `logo` | String | No | URL del logo (Cloudinary) |
| `banner` | String | No | URL del banner (Cloudinary) |
| `isActive` | Boolean | Sí | Tienda activa (default: true) |
| `ownerId` | UUID | Sí | ID del dueño (User) |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `updatedAt` | Timestamp | Sí | Fecha de última actualización |

### Enum: ShopType

```typescript
enum ShopType {
  RETAILER = 'retailer',
  WHOLESALER = 'wholesaler'
}
```

### Enum: ShopStatus

```typescript
enum ShopStatus {
  PENDING_PAYMENT = 'pending_payment',
  ACTIVE = 'active',
  SUSPENDED = 'suspended'
}
```

### Estructura JSON: Schedule

```json
{
  "monday": { "open": "09:00", "close": "18:00" },
  "tuesday": { "open": "09:00", "close": "18:00" },
  "wednesday": { "open": "09:00", "close": "18:00" },
  "thursday": { "open": "09:00", "close": "18:00" },
  "friday": { "open": "09:00", "close": "18:00" },
  "saturday": { "open": "09:00", "close": "13:00" },
  "sunday": null
}
```

### Relaciones

- **owner**: Muchos a uno con `User`
- **products**: Uno a muchos con `Product`
- **reviews**: Uno a muchos con `Review`

### Índices

- `ownerId`
- `type`
- `status`
- `latitude, longitude` (índice espacial para búsquedas geográficas)

### Ejemplo

```json
{
  "id": "shop-uuid-123",
  "name": "Pet Shop Amigo Fiel",
  "description": "Tienda especializada en productos para mascotas",
  "address": "Av. Libertador 1000",
  "province": "Buenos Aires",
  "city": "CABA",
  "latitude": -34.5895,
  "longitude": -58.3974,
  "type": "retailer",
  "status": "active",
  "phone": "+54 9 11 1234-5678",
  "email": "info@petshopamigofiel.com",
  "website": "https://petshopamigofiel.com",
  "schedule": { /* horarios */ },
  "logo": "https://res.cloudinary.com/petshops/logo.jpg",
  "banner": "https://res.cloudinary.com/petshops/banner.jpg",
  "isActive": true,
  "ownerId": "owner-uuid-456",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Product

Representa un producto en venta en una tienda.

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único |
| `name` | String | Sí | Nombre del producto |
| `description` | Text | No | Descripción detallada |
| `priceRetail` | Decimal | Sí | Precio minorista |
| `priceWholesale` | Decimal | No | Precio mayorista |
| `stock` | Integer | Sí | Cantidad en stock |
| `sku` | String | No | Código SKU |
| `barcode` | String | No | Código de barras |
| `brand` | String | No | Marca del producto |
| `characteristics` | JSON | No | Características adicionales |
| `images` | String[] | Sí | Array de URLs de imágenes |
| `isActive` | Boolean | Sí | Producto activo (default: true) |
| `shopId` | UUID | Sí | ID de la tienda |
| `categoryId` | UUID | Sí | ID de la categoría |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `updatedAt` | Timestamp | Sí | Fecha de última actualización |

### Estructura JSON: Characteristics

```json
{
  "weight": "15kg",
  "size": "grande",
  "age": "adulto",
  "flavor": "pollo",
  "nutrients": {
    "protein": "28%",
    "fat": "15%",
    "fiber": "3%"
  }
}
```

### Relaciones

- **shop**: Muchos a uno con `Shop`
- **category**: Muchos a uno con `Category`

### Índices

- `shopId`
- `categoryId`
- `name` (índice de texto para búsquedas)
- `isActive`

### Ejemplo

```json
{
  "id": "product-uuid-789",
  "name": "Alimento Royal Canin Adult 15kg",
  "description": "Alimento balanceado completo para perros adultos",
  "priceRetail": 15000,
  "priceWholesale": 12000,
  "stock": 50,
  "sku": "RC-ADL-15",
  "barcode": "7891234567890",
  "brand": "Royal Canin",
  "characteristics": {
    "weight": "15kg",
    "age": "adulto"
  },
  "images": [
    "https://res.cloudinary.com/petshops/product1.jpg",
    "https://res.cloudinary.com/petshops/product2.jpg"
  ],
  "isActive": true,
  "shopId": "shop-uuid-123",
  "categoryId": "category-uuid-001",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Category

Representa una categoría de productos (jerárquica, 2 niveles).

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único |
| `name` | String | Sí | Nombre de la categoría |
| `description` | Text | No | Descripción |
| `icon` | String | No | URL del icono (Cloudinary) |
| `order` | Integer | Sí | Orden de visualización |
| `isActive` | Boolean | Sí | Categoría activa (default: true) |
| `parentId` | UUID | No | ID de categoría padre (null = raíz) |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `updatedAt` | Timestamp | Sí | Fecha de última actualización |

### Relaciones

- **parent**: Muchos a uno con `Category` (auto-referencia)
- **subcategories**: Uno a muchos con `Category`
- **products**: Uno a muchos con `Product`

### Índices

- `parentId`
- `order`
- `isActive`

### Restricciones

- Solo 2 niveles de jerarquía (categoría padre → subcategoría)
- Una subcategoría no puede tener subcategorías

### Ejemplo

```json
{
  "id": "category-uuid-001",
  "name": "Alimento Perro",
  "description": "Alimento seco y húmedo para perros",
  "icon": "https://res.cloudinary.com/petshops/categories/perro.png",
  "order": 1,
  "isActive": true,
  "parentId": null,
  "subcategories": [
    {
      "id": "category-uuid-002",
      "name": "Alimento Cachorro",
      "icon": "https://res.cloudinary.com/petshops/categories/cachorro.png",
      "order": 1
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Review

Representa una reseña/calificación de una tienda por un usuario.

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único |
| `rating` | Integer | Sí | Calificación (1-5) |
| `comment` | Text | No | Comentario |
| `userId` | UUID | Sí | ID del usuario |
| `shopId` | UUID | Sí | ID de la tienda |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `updatedAt` | Timestamp | Sí | Fecha de última actualización |

### Relaciones

- **user**: Muchos a uno con `User`
- **shop**: Muchos a uno con `Shop`

### Índices

- `userId`
- `shopId`
- `userId, shopId` (índice compuesto UNIQUE)

### Restricciones

- Un usuario solo puede dejar una reseña por tienda
- Rating debe estar entre 1 y 5

### Ejemplo

```json
{
  "id": "review-uuid-111",
  "rating": 5,
  "comment": "Excelente atención y productos de calidad",
  "userId": "user-uuid-222",
  "shopId": "shop-uuid-123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Subscription

Representa una suscripción de usuario a un plan.

### Campos

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | UUID | Sí | Identificador único |
| `plan` | Enum | Sí | Tipo de plan |
| `status` | Enum | Sí | Estado de la suscripción |
| `startDate` | Timestamp | No | Fecha de inicio |
| `endDate` | Timestamp | No | Fecha de fin |
| `price` | Decimal | Sí | Precio pagado |
| `mercadoPagoId` | String | No | ID de pago de Mercado Pago |
| `userId` | UUID | Sí | ID del usuario |
| `createdAt` | Timestamp | Sí | Fecha de creación |
| `updatedAt` | Timestamp | Sí | Fecha de última actualización |

### Enum: SubscriptionPlan

```typescript
enum SubscriptionPlan {
  BASIC = 'basic',
  PREMIUM = 'premium'
}
```

### Enum: SubscriptionStatus

```typescript
enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}
```

### Relaciones

- **user**: Muchos a uno con `User`

### Índices

- `userId`
- `status`
- `mercadoPagoId`

### Ejemplo

```json
{
  "id": "subscription-uuid-999",
  "plan": "premium",
  "status": "active",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-02-01T00:00:00.000Z",
  "price": 9999,
  "mercadoPagoId": "mp-payment-123456",
  "userId": "user-uuid-222",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Diagrama de Relaciones

```
User
├── 1:N → Shop (owner)
├── 1:N → Review
└── 1:N → Subscription

Shop
├── N:1 → User (owner)
├── 1:N → Product
└── 1:N → Review

Product
├── N:1 → Shop
└── N:1 → Category

Category
├── N:1 → Category (parent)
├── 1:N → Category (subcategories)
└── 1:N → Product

Review
├── N:1 → User
└── N:1 → Shop

Subscription
└── N:1 → User
```

---

## Extensiones PostgreSQL Utilizadas

### cube y earthdistance

Permiten cálculos geoespaciales eficientes para búsquedas por proximidad.

```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Consulta ejemplo
SELECT * FROM shops
WHERE earth_distance(
  ll_to_earth(shops.latitude, shops.longitude),
  ll_to_earth(-34.5895, -58.3974)
) < 5000; -- 5km radius
```

Ver [POSTGRES_SETUP.md](./POSTGRES_SETUP.md) para configuración.

---

## Tipos de Datos Especiales

### UUID
Todos los IDs son UUID v4 generados por PostgreSQL.

### Decimal
Usado para precios y coordenadas geográficas con precisión.

### JSON/JSONB
Usado para datos estructurados flexibles (schedule, characteristics).

### Text
Para campos de texto largo sin límite específico.

### Timestamp
Con zona horaria (timestamptz) para fechas.

---

## Estrategias de Carga

### Sin Eager Loading

Todas las relaciones se cargan explícitamente:

```typescript
// ❌ Evitar
@ManyToOne(() => Shop, { eager: true })
shop: Shop;

// ✅ Correcto
@ManyToOne(() => Shop)
shop: Shop;

// Carga explícita
const product = await this.productRepository.findOne({
  where: { id },
  relations: ['shop', 'category']
});
```

### Lazy Loading

Las relaciones se cargan bajo demanda según el caso de uso.

---

## Migraciones

Todas las modificaciones al esquema se gestionan con migraciones de TypeORM.

```bash
# Generar migración
npm run migration:generate -- src/migrations/MigrationName

# Ejecutar migraciones
npm run migration:run

# Revertir última migración
npm run migration:revert
```

---

**Última actualización**: Diciembre 2024
