import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBirthDateAndGenderToPets1765153812187 implements MigrationInterface {
    name = 'AddBirthDateAndGenderToPets1765153812187'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "user_pets" ADD "birthDate" date`);
        await queryRunner.query(`CREATE TYPE "public"."user_pets_gender_enum" AS ENUM('male', 'female')`);
        await queryRunner.query(`ALTER TABLE "user_pets" ADD "gender" "public"."user_pets_gender_enum"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "user_pets" DROP COLUMN "gender"`);
        await queryRunner.query(`DROP TYPE "public"."user_pets_gender_enum"`);
        await queryRunner.query(`ALTER TABLE "user_pets" DROP COLUMN "birthDate"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
