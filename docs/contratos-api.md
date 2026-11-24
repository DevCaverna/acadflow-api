# Contratos REST

Fonte de referência para a API e a Web. Mudanças aqui exigem alinhar `docs/contratos-mock.md` do [acadflow-web](https://github.com/DevCaverna/acadflow-web).

Base: `http://localhost:3000` · JSON · `Authorization: Bearer <JWT>` · `Accept-Language: pt-BR | en`

## Tipos

```ts
type Role = 'PROFESSOR' | 'ALUNO';
type GradeStatus = 'NO_GRADES' | 'APPROVED' | 'RECOVERY' | 'FAILED';

type User = { id: string; name: string; email: string; role: Role };
type Session = { accessToken: string; user: User };
type Discipline = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  semester: string;
  professor: { id: string; name: string };
};
type Activity = {
  id: string;
  disciplineId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
};
type Grade = { activityId: string; studentId: string; value: number };
type GradeSummary = {
  grades: Array<{ activityId: string; value: number }>;
  average: number | null;
  status: GradeStatus;
};
type StudentGrades = GradeSummary & { student: { id: string; name: string; email: string } };
type Listing<T> = { page: number; perPage: number; total: number; data: T[] };
type ApiError = { statusCode: number; code: string; message: string };
```

IDs são UUID v7, datas são ISO 8601 em UTC e notas são números JSON.

## MVP

| Método | Rota                                | Acesso                                     | Corpo                                    | Resposta                         |
| ------ | ----------------------------------- | ------------------------------------------ | ---------------------------------------- | -------------------------------- |
| `GET`  | `/health`                           | Público                                    | —                                        | Estado da API e do banco         |
| `POST` | `/auth/login`                       | Público                                    | `{ email, password }`                    | `200 Session`                    |
| `GET`  | `/auth/me`                          | Autenticado                                | —                                        | `200 User`                       |
| `GET`  | `/disciplines`                      | Professor: as suas; aluno: as matriculadas | —                                        | `200 Listing<Discipline>`        |
| `POST` | `/disciplines`                      | Professor                                  | `{ code, name, semester, description? }` | `201 Discipline`                 |
| `GET`  | `/disciplines/:id`                  | Professor responsável ou aluno matriculado | —                                        | `200 Discipline`                 |
| `GET`  | `/disciplines/:id/students`         | Professor responsável                      | —                                        | `200 Array<{ id, name, email }>` |
| `GET`  | `/disciplines/:id/activities`       | Professor responsável ou aluno matriculado | —                                        | `200 Activity[]`                 |
| `POST` | `/disciplines/:id/activities`       | Professor responsável                      | `{ title, description?, dueAt? }`        | `201 Activity`                   |
| `GET`  | `/disciplines/:id/grades`           | Professor responsável                      | —                                        | `200 StudentGrades[]`            |
| `GET`  | `/disciplines/:id/grades/me`        | Aluno matriculado                          | —                                        | `200 GradeSummary`               |
| `PUT`  | `/activities/:id/grades/:studentId` | Professor responsável                      | `{ value }`                              | `200 Grade`                      |

O `PUT` lança ou atualiza a nota: repetir a chamada não cria outra.

### Paginação

Aplicada em `GET /disciplines`. Query: `page` (padrão 1), `perPage` (padrão 20, máximo 100), `filter` (JSON), `sortField` e `sortDirection` (`asc` ou `desc`).

`GET /disciplines` filtra por `search` (nome ou código) e `semester`, e ordena por `code`, `name` (padrão) ou `semester`. Campo fora da lista retorna `400 VALIDATION_ERROR`.

## Opcionais (depois do fluxo principal)

| Método   | Rota                                | Regra                                    |
| -------- | ----------------------------------- | ---------------------------------------- |
| `PATCH`  | `/disciplines/:id`                  | Edita `name` e `description`             |
| `PATCH`  | `/activities/:id`                   | Edita `title`, `description` e `dueAt`   |
| `DELETE` | `/activities/:id/grades/:studentId` | Remove a nota; volta a "sem nota"        |
| `DELETE` | `/activities/:id`                   | `409` se houver notas                    |
| `DELETE` | `/disciplines/:id`                  | `409` se houver matrículas ou atividades |

Todas são do professor responsável. Não há exclusão em cascata.

## Pós-MVP

- **Cadastro público:** `POST /auth/register`, que cria somente `ALUNO`. No MVP, as contas vêm de seed.
- **Matrículas manuais:** `POST` e `DELETE /disciplines/:id/enrollments`. No MVP, vêm de seed.
- Perfil completo, avatar (R2/Sharp), anexos e notificações.

## Regras

- **Nota:** de 0 a 10, com até uma casa decimal. Ausência de nota nunca é `0`.
- **Média:** aritmética das notas lançadas, arredondada uma vez para uma casa decimal; o valor arredondado define a situação.
- **Situação:** `>= 7` `APPROVED`; `>= 5` e `< 7` `RECOVERY`; `< 5` `FAILED`; sem notas, `average: null` e `NO_GRADES`.
- A Web apresenta a média como **parcial** enquanto houver atividades sem nota.
- `(code, semester)` é único por disciplina; repetir retorna `409 CONFLICT`. `semester` segue `2026.1` ou `2026.2`. `code` e `semester` não mudam depois da criação.
- `PATCH /disciplines/:id` aceita `description: null` para remover a descrição e retorna `200 Discipline`. `DELETE /disciplines/:id` retorna `204`.

## Erros

| Status | `code`                 | Quando                                         |
| ------ | ---------------------- | ---------------------------------------------- |
| `400`  | `VALIDATION_ERROR`     | Dados inválidos, inclusive nota fora da faixa  |
| `401`  | `INVALID_CREDENTIALS`  | Login inválido, sem revelar se o e-mail existe |
| `401`  | `UNAUTHORIZED`         | Token ausente, inválido ou expirado            |
| `403`  | `FORBIDDEN`            | Perfil ou vínculo insuficiente                 |
| `404`  | `NOT_FOUND`            | Recurso inexistente                            |
| `409`  | `CONFLICT`             | Duplicidade ou exclusão bloqueada              |
| `422`  | `STUDENT_NOT_ENROLLED` | Nota para aluno não matriculado                |
| `500`  | `INTERNAL_ERROR`       | Falha inesperada                               |

`message` é traduzida conforme `Accept-Language`; `code` e enums nunca são traduzidos. Sem o cabeçalho, ou com idioma não suportado, a resposta vem em `pt-BR`. Em `VALIDATION_ERROR`, `message` reúne as mensagens dos campos separadas por `; `. Outros status `4xx`, como `413`, mantêm o status e usam `VALIDATION_ERROR`.
