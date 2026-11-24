import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateActivityAttachments1795528902392 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'activity_attachments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, default: 'public.uuid_generate_v7()' },
          { name: 'activity_id', type: 'uuid' },
          { name: 'object_key', type: 'varchar', length: '255' },
          { name: 'original_name', type: 'varchar', length: '255' },
          { name: 'mime_type', type: 'varchar', length: '100' },
          { name: 'size_bytes', type: 'integer' },
          { name: 'uploaded_at', type: 'timestamptz', default: 'now()' },
        ],
        uniques: [{ name: 'UQ_activity_attachments_object_key', columnNames: ['object_key'] }],
        checks: [{ name: 'CHK_activity_attachments_size', expression: 'size_bytes > 0' }],
        foreignKeys: [
          {
            name: 'FK_activity_attachments_activity_id',
            columnNames: ['activity_id'],
            referencedTableName: 'activities',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );
    await queryRunner.createIndex(
      'activity_attachments',
      new TableIndex({
        name: 'IDX_activity_attachments_activity_id',
        columnNames: ['activity_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('activity_attachments');
  }
}
