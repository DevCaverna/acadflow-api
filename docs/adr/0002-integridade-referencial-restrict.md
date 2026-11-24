# ADR-0002: Integridade referencial estrita (`ON DELETE RESTRICT`)

- **Status:** Aceita
- **Data:** 2026-11-23
- **Arquivos relacionados:** `src/database/migrations/1795463175245-InitialSchema.ts`, `src/common/database/postgres-error.ts`

## Contexto

No domínio acadêmico, a exclusão acidental de uma disciplina ou atividade pode apagar em cascata matrículas, lançamentos de notas e histórico de avaliações de dezenas de alunos sem aviso ou recuperação simples.

Durante o refinamento do design (v1.1 → v1.3) e dos contratos REST, houve a necessidade de definir se a exclusão de disciplinas e atividades deveria operar em cascata ou bloquear quando houver registros dependentes.

## Decisão

Definir **`ON DELETE RESTRICT`** em todas as chaves estrangeiras do banco de dados (`disciplines`, `enrollments`, `activities`, `grades` e `activity_attachments`). A camada de serviço intercepta violações de chave estrangeira do PostgreSQL (códigos `23503` e `23001`) via `isForeignKeyViolation()` e responde com `409 CONFLICT` (`ApiException('CONFLICT')`), sem nunca executar exclusão em cascata silenciosa.

## Alternativas Consideradas

- **`ON DELETE CASCADE`:** simplificaria o código de remoção, mas criaria alto risco de perda irreversível de notas e histórico acadêmico.
- **Soft delete (`deleted_at`):** adicionaria complexidade em todas as queries, índices únicos (`code, semester` e `activity_id, student_id`) e regras de média, sem necessidade real no escopo atual.

## Consequências

- **Positivas:** proteção garantida no banco e na API contra perda de histórico acadêmico; remoção de disciplina com matrículas/atividades, atividade com notas/anexos ou matrícula com notas é bloqueada de forma determinística.
- **Negativas:** o usuário precisa remover dependências antes (quando aplicável), e a UI deve exibir mensagens claras de bloqueio quando receber `409 CONFLICT`.

