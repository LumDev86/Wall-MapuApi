import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddCharacteristicsToProducts1710010600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding characteristics field to products table...');

    await queryRunner.addColumn(
      'products',
      new TableColumn({
        name: 'characteristics',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    console.log('✅ Characteristics field added to products table successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing characteristics field from products table...');

    await queryRunner.dropColumn('products', 'characteristics');

    console.log('✅ Characteristics field removed from products table successfully');
  }
}
