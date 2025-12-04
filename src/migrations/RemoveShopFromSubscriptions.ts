import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveShopFromSubscriptions1712345678901 implements MigrationInterface {
  name = 'RemoveShopFromSubscriptions1712345678901'

  public async up(queryRunner: QueryRunner): Promise<void> {

    // 1️⃣ Eliminar foreign key (si existe)
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscription_shop";
    `);

    // 2️⃣ Eliminar columna shopId
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "shopId";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    // 1️⃣ Restaurar columna
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD "shopId" uuid;
    `);

    // 2️⃣ Restaurar foreign key
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD CONSTRAINT "FK_subscription_shop"
      FOREIGN KEY ("shopId") REFERENCES "shops"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);
  }
}
