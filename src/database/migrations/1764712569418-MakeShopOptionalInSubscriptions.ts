import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeShopOptionalInSubscriptions1764712569418 implements MigrationInterface {
    name = 'MakeShopOptionalInSubscriptions1764712569418'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);

        // Step 1: Add userId as nullable first
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD "userId" uuid`);

        // Step 2: Populate userId from shop's owner for existing subscriptions
        await queryRunner.query(`
            UPDATE "subscriptions" s
            SET "userId" = sh."ownerId"
            FROM "shops" sh
            WHERE s."shopId" = sh."id"
            AND s."userId" IS NULL
        `);

        // Step 3: Make userId NOT NULL
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "userId" SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_ca4e665f950a1efacff3332d9e0"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "shopId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_ca4e665f950a1efacff3332d9e0" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_ca4e665f950a1efacff3332d9e0"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN "shopId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_ca4e665f950a1efacff3332d9e0" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
    }

}
