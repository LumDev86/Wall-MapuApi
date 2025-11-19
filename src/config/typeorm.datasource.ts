// src/config/typeorm.datasource.ts
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

// ❌ ELIMINAR esta exportación nombrada
// export const AppDataSource = new DataSource({

// ✅ SOLO esta exportación por defecto
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'postgres',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false,
  } : false,
});

// ❌ NO exportar nada más desde este archivo