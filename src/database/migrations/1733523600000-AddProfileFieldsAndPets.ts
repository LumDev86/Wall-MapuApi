import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from 'typeorm';

export class AddProfileFieldsAndPets1733523600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Adding profile fields to users table...');

    // Agregar campo birthDate
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'birthDate',
        type: 'date',
        isNullable: true,
      }),
    );

    // Agregar campo gender
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'gender',
        type: 'enum',
        enum: ['female', 'male', 'other'],
        isNullable: true,
      }),
    );

    // Agregar campo barrio
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'barrio',
        type: 'varchar',
        length: '100',
        isNullable: true,
      }),
    );

    // Agregar campo hasDogs
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'hasDogs',
        type: 'boolean',
        default: false,
      }),
    );

    // Agregar campo hasCats
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'hasCats',
        type: 'boolean',
        default: false,
      }),
    );

    // Agregar campo hasOtherPets
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'hasOtherPets',
        type: 'boolean',
        default: false,
      }),
    );

    console.log('✅ Profile fields added to users table successfully');

    console.log('🔄 Creating user_pets table...');

    // Crear tabla user_pets
    await queryRunner.createTable(
      new Table({
        name: 'user_pets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['dog', 'cat', 'other'],
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'breed',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'age',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Agregar foreign key
    await queryRunner.createForeignKey(
      'user_pets',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    console.log('✅ user_pets table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🔄 Dropping user_pets table...');

    // Eliminar tabla user_pets
    await queryRunner.dropTable('user_pets');

    console.log('✅ user_pets table dropped successfully');

    console.log('🔄 Removing profile fields from users table...');

    // Eliminar campos de users
    await queryRunner.dropColumn('users', 'hasOtherPets');
    await queryRunner.dropColumn('users', 'hasCats');
    await queryRunner.dropColumn('users', 'hasDogs');
    await queryRunner.dropColumn('users', 'barrio');
    await queryRunner.dropColumn('users', 'gender');
    await queryRunner.dropColumn('users', 'birthDate');

    console.log('✅ Profile fields removed from users table successfully');
  }
}
