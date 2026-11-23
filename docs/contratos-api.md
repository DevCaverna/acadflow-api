# Contratos REST

Fonte de referência para a API e a Web. Mudanças aqui exigem alinhar `docs/contratos-mock.md` do [acadflow-web](https://github.com/DevCaverna/acadflow-web).

Base: `http://localhost:3000` · JSON · `Authorization: Bearer <JWT>` · `Accept-Language: pt-BR | en`

## Tipos

```ts
type Role = 'PROFESSOR' | 'ALUNO';
type GradeStatus = 'SEM_NOTAS' | 'APROVADO' | 'RECUPERACAO' | 'REPROVADO';

type User = { id: string; name: string; email: string; role: Role };
type Session = { accessToken: string; user: User };
type Discipline = {
  id: string; code: string; name: string; description: string | null;
  semester: string; professor: { id: string; name: string };
};
type Activity = {
  id: string; disciplineId: string; title: string;
  description: string | null; dueAt: string | null;
};
type Grade = { activityId: string; studentId: string; value: number };
type GradeSummary = {
  grades: Array<{ activityId: string; value: number }>;
  average: number | null; status: GradeStatus;
};
type StudentGrades = GradeSummary & { student: { id: string; name: string; email: string } };
type ApiError = { statusCode: number; code: string; message: string };
```

IDs são UUID, datas são ISO 8601 em UTC e notas são números JSON.

## MVP

| Método | Rota | Acesso | Corpo | Resposta |
| --- | --- | --- | --- | --- |
| `GET` | `/health` | Público | — | Estado da API e do banco |
| `POST` | `/auth/login` | Público | `{ email, password }` | `200 Session` |
| `GET` | `/auth/me` | Autenticado | — | `200 User` |
| `GET` | `/disciplines` | Professor: as suas; aluno: as matriculadas | — | `200 Discipline[]` |
| `POST` | `/disciplines` | Professor | `{ code, name, semester, description? }` | `201 Discipline` |
| `GET` | `/disciplines/:id` | Professor responsável ou aluno matriculado | — | `200 Discipline` |
| `GET` | `/disciplines/:id/students` | Professor responsável | — | `200 Array<{ id, name, email }>` |
| `GET` | `/disciplines/:id/activities` | Professor responsável ou aluno matriculado | — | `200 Activity[]` |
| `POST` | `/disciplines/:id/activities` | Professor responsável | `{ title, description?, dueAt? }` | `201 Activity` |
| `GET` | `/disciplines/:id/grades` | Professor responsável | — | `200 StudentGrades[]` |
| `GET` | `/disciplines/:id/grades/me` | Aluno matriculado | — | `200 GradeSummary` |
| `PUT` | `/activities/:id/grades/:studentId` | Professor responsável | `{ value }` | `200 Grade` |

O `PUT` lança ou atualiza a nota: repetir a chamada não cria outra.

## Opcionais (depois do fluxo principal)

| Método | Rota | Regra |
| --- | --- | --- |
| `PATCH` | `/disciplines/:id` | Edita `name` e `description` |
| `PATCH` | `/activities/:id` | Edita `title`, `description` e `dueAt` |
| `DELETE` | `/activities/:id/grades/:studentId` | Remove a nota; volta a "sem nota" |
| `DELETE` | `/activities/:id` | `409` se houver notas |
| `DELETE` | `/disciplines/:id` | `409` se houver matrículas ou atividades |

Todas são do professor responsável. Não há exclusão em cascata.

## Pós-MVP

- **Cadastro público:** `POST /auth/register`, que cria somente `ALUNO`. No MVP, as contas vêm de seed.
- **Matrículas manuais:** `POST` e `DELETE /disciplines/:id/enrollments`. No MVP, vêm de seed.
- Perfil completo, avatar (R2/Sharp), anexos e notificações.

## Regras

- **Nota:** de 0 a 10, com até uma casa decimal. Ausência de nota nunca é `0`.
- **Média:** aritmética das notas lançadas, arredondada uma vez para uma casa decimal; o valor arredondado define a situação.
- **Situação:** `>= 7` `APROVADO`; `>= 5` e `< 7` `RECUPERACAO`; `< 5` `REPROVADO`; sem notas, `average: null` e `SEM_NOTAS`.
- A Web apresenta a média como **parcial** enquanto houver atividades sem nota.
- `(code, semester)` é único por disciplina.

## Erros

| Status | `code` | Quando |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Dados inválidos, inclusive nota fora da faixa |
| `401` | `INVALID_CREDENTIALS` | Login inválido, sem revelar se o e-mail existe |
| `401` | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| `403` | `FORBIDDEN` | Perfil ou vínculo insuficiente |
| `404` | `NOT_FOUND` | Recurso inexistente |
| `409` | `CONFLICT` | Duplicidade ou exclusão bloqueada |
| `422` | `STUDENT_NOT_ENROLLED` | Nota para aluno não matriculado |
| `500` | `INTERNAL_ERROR` | Falha inesperada |

`message` é traduzida conforme `Accept-Language`; `code` e enums nunca são traduzidos.
