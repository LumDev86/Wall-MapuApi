import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveShopFromSubscriptions1712171234567 implements MigrationInterface {
  name = 'RemoveShopFromSubscriptions1712171234567';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_subscription_shop";
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "shopId";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD "shopId" uuid;
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD CONSTRAINT "FK_subscription_shop"
      FOREIGN KEY ("shopId") REFERENCES "shops"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);
  }
}
