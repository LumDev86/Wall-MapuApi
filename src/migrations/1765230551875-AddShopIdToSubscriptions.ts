import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShopIdToSubscriptions1765230551875 implements MigrationInterface {
    name = 'AddShopIdToSubscriptions1765230551875'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
