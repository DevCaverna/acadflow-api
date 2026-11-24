import type { DataSource, EntityManager } from 'typeorm';

const PROFESSOR_EMAIL = 'professor@acadflow.local';
const STUDENT_EMAILS = ['aluno@acadflow.local', 'aluna@acadflow.local'];
const DISCIPLINE = {
  code: 'BD-204',
  name: 'Banco de Dados',
  description: 'Modelagem relacional, SQL e normalização',
  semester: '2026.2',
};
const ACTIVITIES = [
  { title: 'Lista 1 - Modelagem', description: 'Modelo entidade-relacionamento' },
  { title: 'Lista 2 - Normalização', description: 'Formas normais' },
];

async function findDisciplineId(manager: EntityManager): Promise<string> {
  await manager.query(
    `INSERT INTO disciplines (code, name, description, semester, professor_id)
     SELECT $1, $2, $3, $4, id FROM users WHERE lower(email) = $5 AND role = 'PROFESSOR'
     ON CONFLICT (code, semester) DO NOTHING`,
    [
      DISCIPLINE.code,
      DISCIPLINE.name,
      DISCIPLINE.description,
      DISCIPLINE.semester,
      PROFESSOR_EMAIL,
    ],
  );
  const rows: Array<{ id: string }> = await manager.query(
    `SELECT d.id FROM disciplines d JOIN users u ON u.id = d.professor_id
     WHERE d.code = $1 AND d.semester = $2 AND lower(u.email) = $3`,
    [DISCIPLINE.code, DISCIPLINE.semester, PROFESSOR_EMAIL],
  );
  if (!rows[0]) throw new Error('Demo discipline belongs to another professor');
  return rows[0].id;
}

export async function seedAcademicData(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const disciplineId = await findDisciplineId(manager);
    await manager.query(
      `INSERT INTO enrollments (student_id, discipline_id)
       SELECT id, $1 FROM users WHERE lower(email) = ANY($2) AND role = 'ALUNO'
       ON CONFLICT DO NOTHING`,
      [disciplineId, STUDENT_EMAILS],
    );
    for (const { title, description } of ACTIVITIES) {
      await manager.query(
        `INSERT INTO activities (discipline_id, title, description)
         SELECT $1::uuid, $2::varchar, $3::text
         WHERE NOT EXISTS (SELECT 1 FROM activities WHERE discipline_id = $1 AND title = $2)`,
        [disciplineId, title, description],
      );
    }
  });
}
