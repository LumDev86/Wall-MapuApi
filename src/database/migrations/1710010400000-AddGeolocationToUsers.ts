import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddGeolocationToUsers1710010400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding geolocation fields to users table...');

    // Agregar campo latitude
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'latitude',
        type: 'decimal',
        precision: 10,
        scale: 7,
        isNullable: true,
      }),
    );

    // Agregar campo longitude
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'longitude',
        type: 'decimal',
        precision: 10,
        scale: 7,
        isNullable: true,
      }),
    );

    console.log('✅ Geolocation fields added to users table successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Removing geolocation fields from users table...');

    await queryRunner.dropColumn('users', 'longitude');
    await queryRunner.dropColumn('users', 'latitude');

    console.log('✅ Geolocation fields removed from users table successfully');
  }
}
