import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFailedToSubscriptionStatus1733337320000 implements MigrationInterface {
  name = 'AddFailedToSubscriptionStatus1733337320000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Paso 1: Verificar si ya existe el valor 'failed' en el enum
    const checkEnum = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'failed' 
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'subscriptions_status_enum'
        )
      ) as exists
    `);

    if (!checkEnum[0].exists) {
      console.log('Agregando valor "failed" al enum subscriptions_status_enum...');
      
      // Paso 2: Agregar el nuevo valor al enum
      await queryRunner.query(`
        ALTER TYPE "subscriptions_status_enum" ADD VALUE 'failed'
      `);
      
      console.log('✅ Valor "failed" agregado exitosamente');
    } else {
      console.log('ℹ️ El valor "failed" ya existe en el enum');
    }

    // Paso 3 (Opcional): Si tienes registros con un estado incorrecto, corrígelos
    // Por ejemplo, si tienes estados 'rejected' o similares
    const invalidRecords = await queryRunner.query(`
      SELECT COUNT(*) as count 
      FROM subscriptions 
      WHERE status NOT IN ('pending', 'active', 'cancelled', 'expired', 'paused', 'failed')
    `);

    if (parseInt(invalidRecords[0].count) > 0) {
      console.log(`⚠️ Encontrados ${invalidRecords[0].count} registros con estados inválidos. Corrigiendo...`);
      
      // Puedes mapear estados inválidos a 'failed' o 'cancelled' según tu lógica
      await queryRunner.query(`
        UPDATE subscriptions 
        SET status = 'failed' 
        WHERE status NOT IN ('pending', 'active', 'cancelled', 'expired', 'paused', 'failed')
      `);
      
      console.log('✅ Registros corregidos');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('⚠️ Revertiendo migración...');
    
    // Paso 1: Cambiar todos los registros con 'failed' a otro estado
    await queryRunner.query(`
      UPDATE subscriptions 
      SET status = 'cancelled' 
      WHERE status = 'failed'
    `);

    // Paso 2: Necesitamos recrear el enum sin 'failed'
    // Esto es complejo en PostgreSQL, así que creamos uno temporal
    
    // 2.1: Cambiar la columna a text temporalmente
    await queryRunner.query(`
      ALTER TABLE subscriptions 
      ALTER COLUMN status TYPE text
    `);

    // 2.2: Eliminar el enum viejo
    await queryRunner.query(`
      DROP TYPE IF EXISTS "subscriptions_status_enum"
    `);

    // 2.3: Crear el enum nuevo sin 'failed'
    await queryRunner.query(`
      CREATE TYPE "subscriptions_status_enum" AS ENUM (
        'pending', 
        'active', 
        'cancelled', 
        'expired', 
        'paused'
      )
    `);

    // 2.4: Convertir la columna de vuelta al enum
    await queryRunner.query(`
      ALTER TABLE subscriptions 
      ALTER COLUMN status TYPE "subscriptions_status_enum" 
      USING status::text::"subscriptions_status_enum"
    `);

    console.log('✅ Migración revertida');
  }
}