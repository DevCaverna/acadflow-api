import { type MigrationInterface, type QueryRunner } from 'typeorm';

const TABLES = ['users', 'disciplines', 'activities', 'grades'];

export class UseUuidV71795522438629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION public.uuid_generate_v7() RETURNS uuid
      LANGUAGE sql VOLATILE PARALLEL SAFE
      SET search_path = pg_catalog
      AS $$
        SELECT encode(
          set_bit(
            set_bit(
              overlay(
                uuid_send(gen_random_uuid())
                PLACING substring(
                  int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3
                )
                FROM 1 FOR 6
              ),
              52, 1
            ),
            53, 1
          ),
          'hex'
        )::uuid
      $$
    `);
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT public.uuid_generate_v7()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
      );
    }
    await queryRunner.query('DROP FUNCTION public.uuid_generate_v7()');
  }
}
