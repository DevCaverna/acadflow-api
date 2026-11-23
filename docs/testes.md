# Testes

Vitest + Supertest. PostgreSQL 17 temporário via Docker para integração e E2E.

| Tipo       | Arquivos                            | Banco                            |
| ---------- | ----------------------------------- | -------------------------------- |
| Unitário   | `src/**/*.spec.ts`                  | Não usa; dependências mockadas   |
| Integração | `test/integration/**/*.int-spec.ts` | Temporário, com migrations reais |
| E2E        | `test/e2e/**/*.e2e-spec.ts`         | Temporário, HTTP com Supertest   |

## Comandos

| Comando                                   | O que faz               |
| ----------------------------------------- | ----------------------- |
| `pnpm test:unit` / `pnpm test:unit:watch` | Unitários, sem Docker   |
| `pnpm test:docker [1..4]`                 | Integração e E2E        |
| `pnpm test:integration:docker [1..4]`     | Só integração           |
| `pnpm test:e2e:docker [1..4]`             | Só E2E                  |
| `pnpm test:cov`                           | Cobertura dos unitários |

## Como funciona

1. `scripts/run-docker-tests.mjs` sobe um projeto Compose exclusivo, sem publicar a porta do banco.
2. `prepare-test-dbs.mjs` cria `acadflow_test_1` a `_N` (até quatro) e aplica as migrations em cada um.
3. Cada worker do Vitest escolhe seu banco por `VITEST_POOL_ID`.
4. Ao final, inclusive após falha, roda `down --volumes --remove-orphans`.

## Regras

- O setup recusa host diferente de `postgres` ou `NODE_ENV` diferente de `test`: testes nunca tocam no banco de desenvolvimento.
- Bancos separados isolam workers; testes do mesmo worker precisam limpar os próprios dados.
- `synchronize` fica sempre `false`.
- Casos mínimos: média sem notas, 4,9, 5,0, 6,9 e 7,0; nota fora da faixa; autorização por perfil e vínculo.

Para mudar as credenciais descartáveis, copie `.env.test.example` para `.env.test`. Se a execução for interrompida à força, remova o projeto Compose temporário manualmente.
