import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClickCountToShops1766089402062 implements MigrationInterface {
    name = 'AddClickCountToShops1766089402062'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shops" ADD "clickCount" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "shops" DROP COLUMN "clickCount"`);
    }

}
