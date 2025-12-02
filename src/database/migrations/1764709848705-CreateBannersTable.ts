import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBannersTable1764709848705 implements MigrationInterface {
    name = 'CreateBannersTable1764709848705'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."banners_status_enum" AS ENUM('pending_payment', 'active', 'inactive', 'payment_failed')`);
        await queryRunner.query(`CREATE TABLE "banners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "imageUrl" character varying NOT NULL, "status" "public"."banners_status_enum" NOT NULL DEFAULT 'pending_payment', "price" numeric(10,2) NOT NULL, "mercadoPagoPaymentId" character varying, "mercadoPagoPreferenceId" character varying, "paymentAttempts" integer NOT NULL DEFAULT '0', "paidAt" TIMESTAMP, "userId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e9b186b959296fcb940790d31c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "banners" ADD CONSTRAINT "FK_f5e969f34b23458e65a1603187b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "banners" DROP CONSTRAINT "FK_f5e969f34b23458e65a1603187b"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`DROP TABLE "banners"`);
        await queryRunner.query(`DROP TYPE "public"."banners_status_enum"`);
    }

}
