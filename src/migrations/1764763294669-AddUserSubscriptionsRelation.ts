import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserSubscriptionsRelation1764763294669 implements MigrationInterface {
    name = 'AddUserSubscriptionsRelation1764763294669'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
