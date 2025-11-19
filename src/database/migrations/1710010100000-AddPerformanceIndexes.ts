// src/database/migrations/1710010200000-OptimizePerformanceIndexes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizePerformanceIndexes1710010200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Optimizing performance indexes...');

    // ❌ ELIMINAR ÍNDICES POCO ÚTILES
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_brand`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shops_city_province`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_parent_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_categories_order`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_role_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_price_retail`);

    // ✅ AGREGAR ÍNDICES MÁS ESPECÍFICOS
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_products_search_complete 
      ON products USING gin(
        to_tsvector('spanish', name),
        to_tsvector('spanish', COALESCE(description, ''))
      ) WHERE "isActive" = true AND stock > 0;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_shops_geo_complete 
      ON shops(latitude, longitude, type, status) 
      WHERE "isActive" = true AND status = 'active';
    `);

    console.log('✅ Performance indexes optimized successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recuperar índices originales si es necesario
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand) WHERE brand IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_shops_city_province ON shops(city, province) WHERE city IS NOT NULL AND province IS NOT NULL;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_categories_parent_active ON categories("parentId", "isActive") WHERE "isActive" = true;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_categories_order ON categories("order", "isActive") WHERE "isActive" = true;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, "isActive") WHERE "isActive" = true;`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_products_price_retail ON products("priceRetail") WHERE "priceRetail" IS NOT NULL;`);
    
    await queryRunner.query(`DROP INDEX IF EXISTS idx_products_search_complete`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_shops_geo_complete`);
  }
}