import { type MigrationInterface, type QueryRunner, Table, TableIndex } from 'typeorm';

const id = { name: 'id', type: 'uuid', isPrimary: true, default: 'gen_random_uuid()' };
const createdAt = { name: 'created_at', type: 'timestamptz', default: 'now()' };
const updatedAt = { name: 'updated_at', type: 'timestamptz', default: 'now()' };

function foreignKey(owner: string, column: string, table: string) {
  return {
    name: `FK_${owner}_${column}`,
    columnNames: [column],
    referencedTableName: table,
    referencedColumnNames: ['id'],
    onDelete: 'RESTRICT',
  };
}

export class InitialSchema1795463175245 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          id,
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'email', type: 'varchar', length: '255' },
          { name: 'password_hash', type: 'varchar', length: '255' },
          { name: 'role', type: 'varchar', length: '16' },
          { name: 'avatar_key', type: 'text', isNullable: true },
          createdAt,
          updatedAt,
        ],
        checks: [{ name: 'CHK_users_role', expression: `role IN ('PROFESSOR', 'ALUNO')` }],
      }),
    );
    await queryRunner.query('CREATE UNIQUE INDEX "UQ_users_email" ON users (lower(email))');

    await queryRunner.createTable(
      new Table({
        name: 'disciplines',
        columns: [
          id,
          { name: 'code', type: 'varchar', length: '20' },
          { name: 'name', type: 'varchar', length: '120' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'semester', type: 'varchar', length: '7' },
          { name: 'professor_id', type: 'uuid' },
          createdAt,
          updatedAt,
        ],
        uniques: [{ name: 'UQ_disciplines_code_semester', columnNames: ['code', 'semester'] }],
        foreignKeys: [foreignKey('disciplines', 'professor_id', 'users')],
      }),
    );
    await queryRunner.createIndex(
      'disciplines',
      new TableIndex({ name: 'IDX_disciplines_professor_id', columnNames: ['professor_id'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'enrollments',
        columns: [
          { name: 'student_id', type: 'uuid', isPrimary: true },
          { name: 'discipline_id', type: 'uuid', isPrimary: true },
          createdAt,
        ],
        foreignKeys: [
          foreignKey('enrollments', 'student_id', 'users'),
          foreignKey('enrollments', 'discipline_id', 'disciplines'),
        ],
      }),
    );
    await queryRunner.createIndex(
      'enrollments',
      new TableIndex({ name: 'IDX_enrollments_discipline_id', columnNames: ['discipline_id'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'activities',
        columns: [
          id,
          { name: 'discipline_id', type: 'uuid' },
          { name: 'title', type: 'varchar', length: '160' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'due_at', type: 'timestamptz', isNullable: true },
          createdAt,
          updatedAt,
        ],
        foreignKeys: [foreignKey('activities', 'discipline_id', 'disciplines')],
      }),
    );
    await queryRunner.createIndex(
      'activities',
      new TableIndex({ name: 'IDX_activities_discipline_id', columnNames: ['discipline_id'] }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'grades',
        columns: [
          id,
          { name: 'student_id', type: 'uuid' },
          { name: 'activity_id', type: 'uuid' },
          { name: 'value', type: 'numeric', precision: 3, scale: 1 },
          createdAt,
          updatedAt,
        ],
        uniques: [
          { name: 'UQ_grades_activity_student', columnNames: ['activity_id', 'student_id'] },
        ],
        checks: [{ name: 'CHK_grades_value', expression: 'value >= 0 AND value <= 10' }],
        foreignKeys: [
          foreignKey('grades', 'student_id', 'users'),
          foreignKey('grades', 'activity_id', 'activities'),
        ],
      }),
    );
    await queryRunner.createIndex(
      'grades',
      new TableIndex({ name: 'IDX_grades_student_id', columnNames: ['student_id'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['grades', 'activities', 'enrollments', 'disciplines', 'users']) {
      await queryRunner.dropTable(table);
    }
  }
}
