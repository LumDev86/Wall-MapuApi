import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAddressFieldsToUsers1710010500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding address fields to users table...');

    // Agregar campo province
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'province',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Agregar campo city
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'city',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Agregar campo address
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'address',
        type: 'varchar',
        isNullable: true,
      }),
    );

    console.log('✅ Address fields added to users table successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing address fields from users table...');

    await queryRunner.dropColumn('users', 'address');
    await queryRunner.dropColumn('users', 'city');
    await queryRunner.dropColumn('users', 'province');

    console.log('✅ Address fields removed from users table successfully');
  }
}
