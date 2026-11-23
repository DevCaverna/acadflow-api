# Contratos REST — rascunho congelado para desenvolvimento paralelo

Base: `http://localhost:3000` · JSON · JWT Bearer · `Accept-Language: pt-BR|en`

| Método | Rota | Acesso | Resposta principal |
| --- | --- | --- | --- |
| POST | /auth/login | Público | `{ accessToken, user: { id, name, email, role } }` |
| GET | /auth/me | Autenticado | `{ id, name, email, role, avatarKey? }` |
| GET | /disciplines | Professor/Aluno | Lista de disciplinas autorizadas |
| POST | /disciplines | Professor | Disciplina criada |
| GET | /disciplines/:id/activities | Matriculado/professor responsável | Lista de atividades |
| POST | /disciplines/:id/activities | Professor responsável | Atividade criada |
| GET | /disciplines/:id/grades/me | Aluno matriculado | `{ grades, average, status }` |
| PUT | /activities/:id/grades/:studentId | Professor responsável | Nota persistida |

Enums estáveis: `role: 'PROFESSOR'|'ALUNO'`; `status: 'SEM_NOTAS'|'APROVADO'|'RECUPERACAO'|'REPROVADO'`. Nota numérica 0..10; ausência de notas retorna `average: null` e `status: SEM_NOTAS`. Texto de erro localizado, código estável: `{ statusCode, code, message }`.

O frontend pode implementar mocks com estes formatos **sem esperar pelo backend**. Ajustes posteriores exigem alinhar os READMEs e os cards do Linear.
