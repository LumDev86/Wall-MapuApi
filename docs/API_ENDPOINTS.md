# Documentación de Endpoints de la API

Base URL: `http://localhost:3000/api`

## Swagger Documentation

La documentación interactiva completa está disponible en:
```
http://localhost:3000/api/docs
```

---

## Auth Endpoints

### POST /auth/register
Registrar un nuevo usuario.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "Juan Pérez",
  "phone": "+54 9 11 1234-5678",
  "province": "Buenos Aires",
  "city": "CABA",
  "address": "Av. Corrientes 1234",
  "role": "client"
}
```

**Response** (201):
```json
{
  "message": "Usuario registrado exitosamente. Por favor verifica tu email.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Juan Pérez",
    "role": "client"
  }
}
```

---

### POST /auth/login
Iniciar sesión.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Juan Pérez",
    "role": "client"
  }
}
```

---

### POST /auth/verify-email
Verificar email del usuario.

**Request Body**:
```json
{
  "token": "verification-token-from-email"
}
```

**Response** (200):
```json
{
  "message": "Email verificado exitosamente"
}
```

---

### POST /auth/forgot-password
Solicitar recuperación de contraseña.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "message": "Email de recuperación enviado"
}
```

---

### POST /auth/reset-password
Restablecer contraseña.

**Request Body**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

**Response** (200):
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

---

## Users Endpoints

### GET /users/profile
Obtener perfil del usuario actual.

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Juan Pérez",
  "phone": "+54 9 11 1234-5678",
  "province": "Buenos Aires",
  "city": "CABA",
  "address": "Av. Corrientes 1234",
  "role": "client",
  "isEmailVerified": true,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PATCH /users/profile
Actualizar perfil del usuario.

**Headers**: `Authorization: Bearer {token}`

**Request Body** (todos los campos opcionales):
```json
{
  "name": "Juan Carlos Pérez",
  "phone": "+54 9 11 9999-9999",
  "province": "Buenos Aires",
  "city": "La Plata",
  "address": "Calle Nueva 456"
}
```

**Response** (200):
```json
{
  "message": "Perfil actualizado exitosamente",
  "user": { /* datos actualizados */ }
}
```

---

### DELETE /users/account
Eliminar cuenta (soft delete).

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "message": "Cuenta eliminada exitosamente"
}
```

---

## Shops Endpoints

### POST /shops
Crear una nueva tienda.

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `retailer`, `wholesaler`

**Request** (multipart/form-data):
```
name: "Mi Pet Shop"
description: "Tienda de productos para mascotas"
address: "Av. Libertador 1000"
city: "CABA"
province: "Buenos Aires"
type: "retailer"
phone: "+54 9 11 1234-5678"
email: "info@mipetshop.com"
website: "https://mipetshop.com"
schedule: {
  "monday": { "open": "09:00", "close": "18:00" },
  "tuesday": { "open": "09:00", "close": "18:00" }
}
logo: [file]
banner: [file]
```

**Response** (201):
```json
{
  "message": "Local registrado exitosamente.",
  "shop": {
    "id": "uuid",
    "name": "Mi Pet Shop",
    "address": "Av. Libertador 1000, CABA, Buenos Aires",
    "latitude": -34.5895,
    "longitude": -58.3974,
    "type": "retailer",
    "status": "active",
    "logo": "https://cloudinary.com/...",
    "banner": "https://cloudinary.com/..."
  },
  "geocodedAddress": "Av. del Libertador 1000, Buenos Aires, Argentina"
}
```

---

### GET /shops
Listar tiendas con filtros.

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `type` (string): `retailer` | `wholesaler`
- `status` (string): `pending_payment` | `active` | `suspended`
- `latitude` (number): Latitud del usuario
- `longitude` (number): Longitud del usuario
- `radius` (number, default: 10): Radio en km
- `openNow` (boolean): Filtrar tiendas abiertas ahora
- `product` (string): Buscar por nombre de producto

**Example**: `/shops?latitude=-34.5895&longitude=-58.3974&radius=5&type=retailer`

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mi Pet Shop",
      "address": "Av. Libertador 1000",
      "latitude": -34.5895,
      "longitude": -58.3974,
      "type": "retailer",
      "status": "active",
      "logo": "https://cloudinary.com/...",
      "banner": "https://cloudinary.com/..."
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### GET /shops/my-shop
Obtener mi tienda (dueño).

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `retailer`, `wholesaler`

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Mi Pet Shop",
  "description": "...",
  "address": "Av. Libertador 1000",
  "latitude": -34.5895,
  "longitude": -58.3974,
  "type": "retailer",
  "status": "active",
  "owner": {
    "id": "uuid",
    "email": "owner@example.com",
    "name": "Owner Name",
    "role": "retailer"
  },
  "products": [
    {
      "id": "uuid",
      "name": "Producto 1",
      "priceRetail": 5000,
      "stock": 10,
      "images": ["https://..."]
    }
  ]
}
```

---

### GET /shops/:id
Obtener detalle de una tienda.

**Query Parameters**:
- `page` (number, default: 1): Página de productos
- `limit` (number, default: 10): Productos por página

**Response** (200):
```json
{
  "shop": {
    "id": "uuid",
    "name": "Mi Pet Shop",
    "description": "...",
    "address": "Av. Libertador 1000",
    "latitude": -34.5895,
    "longitude": -58.3974,
    "type": "retailer",
    "status": "active",
    "phone": "+54 9 11 1234-5678",
    "email": "info@mipetshop.com",
    "website": "https://mipetshop.com",
    "schedule": { /* horarios */ },
    "logo": "https://...",
    "banner": "https://...",
    "owner": {
      "id": "uuid",
      "name": "Owner Name",
      "email": "owner@example.com"
    }
  },
  "products": [
    {
      "id": "uuid",
      "name": "Producto 1",
      "priceRetail": 5000,
      "stock": 10,
      "images": ["https://..."]
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### PATCH /shops/:id
Actualizar tienda.

**Headers**: `Authorization: Bearer {token}`

**Permisos**: Solo el dueño puede actualizar

**Request** (multipart/form-data):
```
name: "Nuevo Nombre"
description: "Nueva descripción"
phone: "+54 9 11 9999-9999"
logo: [file]
banner: [file]
```

**Response** (200):
```json
{
  "message": "Local actualizado exitosamente",
  "shop": { /* datos actualizados */ }
}
```

---

### DELETE /shops/:id
Eliminar tienda.

**Headers**: `Authorization: Bearer {token}`

**Permisos**: Solo el dueño puede eliminar

**Response** (200):
```json
{
  "message": "Local eliminado exitosamente"
}
```

---

## Products Endpoints

### POST /products
Crear un nuevo producto.

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `retailer`, `wholesaler`

**Request** (multipart/form-data):
```
name: "Alimento Royal Canin"
description: "Alimento balanceado para perros adultos"
priceRetail: 15000
priceWholesale: 12000
stock: 50
sku: "RC-001"
barcode: "7891234567890"
brand: "Royal Canin"
categoryId: "uuid"
images: [file1, file2, file3]
```

**Response** (201):
```json
{
  "message": "Producto creado exitosamente",
  "product": {
    "id": "uuid",
    "name": "Alimento Royal Canin",
    "description": "...",
    "priceRetail": 15000,
    "priceWholesale": 12000,
    "stock": 50,
    "images": ["https://...", "https://..."],
    "shop": {
      "id": "uuid",
      "name": "Mi Pet Shop",
      "type": "retailer"
    },
    "category": {
      "id": "uuid",
      "name": "Alimento Perro"
    }
  }
}
```

---

### GET /products
Listar productos con paginación.

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alimento Royal Canin",
      "priceRetail": 15000,
      "priceWholesale": 12000,
      "stock": 50,
      "images": ["https://..."],
      "shop": {
        "id": "uuid",
        "name": "Mi Pet Shop",
        "type": "retailer",
        "logo": "https://..."
      },
      "category": {
        "id": "uuid",
        "name": "Alimento Perro",
        "icon": "https://..."
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "cached": true
}
```

---

### GET /products/search
Buscar productos por nombre.

**Query Parameters**:
- `query` (string, required): Término de búsqueda
- `limit` (number, default: 20)

**Example**: `/products/search?query=royal&limit=10`

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alimento Royal Canin",
      "description": "...",
      "brand": "Royal Canin",
      "priceRetail": 15000,
      "stock": 50,
      "images": ["https://..."],
      "category": {
        "id": "uuid",
        "name": "Alimento Perro"
      },
      "shop": {
        "id": "uuid",
        "name": "Mi Pet Shop",
        "rating": 4.5,
        "reviewCount": 10
      }
    }
  ],
  "total": 5,
  "query": "royal"
}
```

---

### GET /products/shop/:shopId
Obtener productos de una tienda.

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Response** (200):
```json
{
  "data": [ /* array de productos */ ],
  "pagination": { /* metadata de paginación */ }
}
```

---

### GET /products/:id
Obtener detalle de un producto.

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Alimento Royal Canin",
  "description": "Alimento balanceado para perros adultos",
  "priceRetail": 15000,
  "priceWholesale": 12000,
  "stock": 50,
  "sku": "RC-001",
  "barcode": "7891234567890",
  "brand": "Royal Canin",
  "characteristics": { /* JSON con características */ },
  "images": ["https://...", "https://..."],
  "shop": {
    "id": "uuid",
    "name": "Mi Pet Shop",
    "type": "retailer",
    "logo": "https://..."
  },
  "category": {
    "id": "uuid",
    "name": "Alimento Perro",
    "icon": "https://..."
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PATCH /products/:id
Actualizar producto.

**Headers**: `Authorization: Bearer {token}`

**Permisos**: Solo el dueño de la tienda puede actualizar

**Request** (multipart/form-data - todos los campos opcionales):
```
name: "Nuevo Nombre"
priceRetail: 16000
stock: 45
images: [file1, file2]
```

**Response** (200):
```json
{
  "message": "Producto actualizado exitosamente",
  "product": { /* datos actualizados */ }
}
```

---

### DELETE /products/:id
Eliminar producto (soft delete).

**Headers**: `Authorization: Bearer {token}`

**Permisos**: Solo el dueño de la tienda puede eliminar

**Response** (200):
```json
{
  "message": "Producto eliminado exitosamente"
}
```

---

## Categories Endpoints

### POST /categories
Crear una nueva categoría.

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Request** (multipart/form-data):
```
name: "Accesorios"
description: "Accesorios para mascotas"
order: 1
parentId: "uuid-optional"
icon: [file]
```

**Response** (201):
```json
{
  "message": "Categoría creada exitosamente",
  "category": {
    "id": "uuid",
    "name": "Accesorios",
    "description": "Accesorios para mascotas",
    "icon": "https://...",
    "order": 1,
    "isActive": true
  }
}
```

---

### GET /categories
Listar todas las categorías activas.

**Response** (200):
```json
{
  "total": 5,
  "categories": [
    {
      "id": "uuid",
      "name": "Alimento Perro",
      "description": "...",
      "icon": "https://...",
      "order": 1,
      "isActive": true,
      "subcategories": [
        {
          "id": "uuid",
          "name": "Alimento Cachorro",
          "icon": "https://...",
          "order": 1
        }
      ]
    }
  ]
}
```

---

### GET /categories/:id
Obtener detalle de una categoría.

**Response** (200):
```json
{
  "id": "uuid",
  "name": "Alimento Perro",
  "description": "...",
  "icon": "https://...",
  "order": 1,
  "isActive": true,
  "parent": null,
  "subcategories": [
    {
      "id": "uuid",
      "name": "Alimento Cachorro",
      "icon": "https://...",
      "order": 1
    }
  ],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### GET /categories/:id/products
Obtener productos de una categoría.

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Alimento Royal Canin",
      "priceRetail": 15000,
      "priceWholesale": 12000,
      "stock": 50,
      "images": ["https://..."],
      "shop": {
        "id": "uuid",
        "name": "Mi Pet Shop",
        "type": "retailer"
      }
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### PATCH /categories/:id
Actualizar categoría.

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Request** (multipart/form-data):
```
name: "Nuevo Nombre"
description: "Nueva descripción"
order: 2
icon: [file]
```

**Response** (200):
```json
{
  "message": "Categoría actualizada exitosamente",
  "category": { /* datos actualizados */ }
}
```

---

### DELETE /categories/:id
Eliminar categoría (soft delete).

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Nota**: No se puede eliminar una categoría que tenga subcategorías.

**Response** (200):
```json
{
  "message": "Categoría eliminada exitosamente"
}
```

---

## Reviews Endpoints

### POST /reviews
Crear una reseña.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "shopId": "uuid",
  "rating": 5,
  "comment": "Excelente atención y productos de calidad"
}
```

**Response** (201):
```json
{
  "message": "Reseña creada exitosamente",
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "Excelente atención y productos de calidad",
    "user": {
      "id": "uuid",
      "name": "Juan Pérez"
    },
    "shop": {
      "id": "uuid",
      "name": "Mi Pet Shop"
    },
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### GET /reviews/shop/:shopId
Obtener reseñas de una tienda.

**Response** (200):
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Excelente atención",
      "user": {
        "id": "uuid",
        "name": "Juan Pérez"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "averageRating": 4.5,
  "totalReviews": 10
}
```

---

### PATCH /reviews/:id
Actualizar reseña.

**Headers**: `Authorization: Bearer {token}`

**Permisos**: Solo el autor puede actualizar

**Request Body**:
```json
{
  "rating": 4,
  "comment": "Buena atención"
}
```

**Response** (200):
```json
{
  "message": "Reseña actualizada exitosamente",
  "review": { /* datos actualizados */ }
}
```

---

### DELETE /reviews/:id
Eliminar reseña.

**Headers**: `Authorization: Bearer {token}`

**Permisos**: Solo el autor puede eliminar

**Response** (200):
```json
{
  "message": "Reseña eliminada exitosamente"
}
```

---

## Subscriptions Endpoints

### POST /subscriptions/create
Crear una suscripción.

**Headers**: `Authorization: Bearer {token}`

**Request Body**:
```json
{
  "plan": "premium"
}
```

**Response** (201):
```json
{
  "message": "Suscripción creada. Procede al pago.",
  "subscription": {
    "id": "uuid",
    "plan": "premium",
    "status": "pending",
    "price": 9999
  },
  "paymentUrl": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=..."
}
```

---

### GET /subscriptions
Listar todas las suscripciones (Admin).

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string): `pending` | `active` | `cancelled` | `expired`
- `plan` (string): `basic` | `premium`
- `userId` (string): Filtrar por usuario
- `startDate` (string): Fecha inicio (ISO)
- `endDate` (string): Fecha fin (ISO)

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "plan": "premium",
      "status": "active",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-02-01T00:00:00.000Z",
      "price": 9999,
      "user": {
        "id": "uuid",
        "name": "Juan Pérez",
        "email": "juan@example.com"
      }
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### GET /subscriptions/history
Obtener historial de suscripciones del usuario.

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "plan": "premium",
      "status": "active",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-02-01T00:00:00.000Z",
      "price": 9999
    }
  ],
  "total": 3
}
```

---

### GET /subscriptions/active
Obtener suscripción activa del usuario.

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "subscription": {
    "id": "uuid",
    "plan": "premium",
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z",
    "price": 9999
  }
}
```

---

### POST /subscriptions/cancel
Cancelar suscripción activa.

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "message": "Suscripción cancelada exitosamente"
}
```

---

### POST /subscriptions/webhook
Webhook de Mercado Pago.

**Nota**: Este endpoint es llamado automáticamente por Mercado Pago.

**Request Body**:
```json
{
  "type": "payment",
  "data": {
    "id": "payment-id"
  }
}
```

**Response** (200):
```json
{
  "message": "Webhook procesado"
}
```

---

## Admin Endpoints

### GET /admin/users
Listar todos los usuarios (Admin).

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `role` (string): Filtrar por rol

**Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Juan Pérez",
      "role": "client",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### PATCH /admin/users/:id/role
Cambiar rol de un usuario.

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Request Body**:
```json
{
  "role": "retailer"
}
```

**Response** (200):
```json
{
  "message": "Rol actualizado exitosamente",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Juan Pérez",
    "role": "retailer"
  }
}
```

---

### DELETE /admin/users/:id
Eliminar un usuario (hard delete).

**Headers**: `Authorization: Bearer {token}`

**Roles permitidos**: `admin`

**Response** (200):
```json
{
  "message": "Usuario eliminado exitosamente"
}
```

---

## Códigos de Estado HTTP

- **200 OK**: Solicitud exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Datos inválidos
- **401 Unauthorized**: No autenticado
- **403 Forbidden**: Sin permisos
- **404 Not Found**: Recurso no encontrado
- **409 Conflict**: Conflicto (ej: email duplicado)
- **500 Internal Server Error**: Error del servidor

---

## Formato de Errores

```json
{
  "statusCode": 400,
  "message": "Descripción del error",
  "error": "Bad Request"
}
```

---

**Última actualización**: Diciembre 2024
