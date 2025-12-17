import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPromotionalBannerToShops1734308000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding promotionalBanner field to shops table...');

    await queryRunner.addColumn(
      'shops',
      new TableColumn({
        name: 'promotionalBanner',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    console.log('✅ promotionalBanner field added to shops table successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing promotionalBanner field from shops table...');

    await queryRunner.dropColumn('shops', 'promotionalBanner');

    console.log('✅ promotionalBanner field removed from shops table successfully');
  }
}
