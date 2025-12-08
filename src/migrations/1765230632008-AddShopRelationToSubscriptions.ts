import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShopRelationToSubscriptions1765230632008 implements MigrationInterface {
    name = 'AddShopRelationToSubscriptions1765230632008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "shopId" uuid`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_ca4e665f950a1efacff3332d9e0" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_ca4e665f950a1efacff3332d9e0"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "shopId"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
