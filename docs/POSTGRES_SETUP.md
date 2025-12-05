# PostgreSQL Setup Requirements

## Extensiones Requeridas

Este proyecto requiere las siguientes extensiones de PostgreSQL para funcionar correctamente:

### 1. **cube** y **earthdistance**

Estas extensiones son necesarias para los cálculos de distancia geográfica en el módulo de Shops.

#### Instalación

Conéctate a tu base de datos PostgreSQL y ejecuta:

```sql
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
```

#### Verificación

Para verificar que las extensiones están instaladas:

```sql
SELECT * FROM pg_extension WHERE extname IN ('cube', 'earthdistance');
```

#### Uso en el Proyecto

Las extensiones se utilizan en `src/modules/shops/shops.service.ts` para calcular distancias entre coordenadas:

```typescript
// Ejemplo de uso en el código
query.andWhere(`
  earth_distance(
    ll_to_earth(shop.latitude, shop.longitude),
    ll_to_earth(:lat, :lng)
  ) < :dist
`, {
  lat: latitude,
  lng: longitude,
  dist: radius * 1000,
});
```

### Funciones Utilizadas

- `ll_to_earth(latitude, longitude)`: Convierte coordenadas lat/lng a un punto en el espacio 3D
- `earth_distance(point1, point2)`: Calcula la distancia entre dos puntos en metros

## Nota sobre Portabilidad

⚠️ **Importante**: El uso de estas extensiones específicas de PostgreSQL significa que el proyecto **NO es compatible** con otros motores de base de datos (MySQL, SQLite, etc.) sin modificaciones significativas.

Si necesitas portabilidad entre diferentes bases de datos, considera reemplazar las funciones específicas de PostgreSQL con implementaciones de la fórmula Haversine en JavaScript (como se hace en el módulo de Products).

## Ejemplo de Implementación Alternativa (Haversine)

El módulo de Products usa una implementación de Haversine en SQL puro que es más portable:

```typescript
queryBuilder.addSelect(
  `(
    6371 * acos(
      cos(radians(:latitude)) *
      cos(radians(shop.latitude)) *
      cos(radians(shop.longitude) - radians(:longitude)) +
      sin(radians(:latitude)) *
      sin(radians(shop.latitude))
    )
  )`,
  'shop_distance'
);
```

Esta implementación funciona en cualquier base de datos que soporte funciones trigonométricas estándar.

## Troubleshooting

### Error: "function earth_distance does not exist"

**Solución**: Ejecuta los comandos de instalación de extensiones mencionados arriba.

### Error: "extension "cube" is not available"

**Solución**: Asegúrate de que tu instalación de PostgreSQL incluye el paquete `postgresql-contrib`. En sistemas basados en Debian/Ubuntu:

```bash
sudo apt-get install postgresql-contrib
```

En macOS con Homebrew:

```bash
brew install postgresql
```

Las extensiones contrib vienen incluidas por defecto.

## Referencias

- [PostgreSQL earthdistance Documentation](https://www.postgresql.org/docs/current/earthdistance.html)
- [PostgreSQL cube Documentation](https://www.postgresql.org/docs/current/cube.html)
