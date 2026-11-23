# Padrão de migrations TypeORM (pnpm)

| Script                       | O que faz                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| `pnpm migration:create Nome` | Cria o arquivo com timestamp em `src/database/migrations/` |
| `pnpm migration:show`        | Lista executadas e pendentes                               |
| `pnpm migration:run`         | Executa as pendentes                                       |
| `pnpm migration:revert`      | Desfaz só a última                                         |

`show`, `run` e `revert` compilam o projeto e usam `dist/database/data-source.js`, o mesmo código que roda em produção.

Exemplo: `pnpm migration:create CreateUsersTable`, preencher `up()` e `down()`, conferir `pnpm migration:show`, rodar `pnpm migration:run`.

A criação recebe timestamp automático do CLI. `DB_*` é lido em runtime. Usar `synchronize: false`; Em produção, aplicar em etapa única de release. Não fazer revert em produção sem análise de dados.

## Import aliases e build

O TypeScript não reescreve os imports `@/` no JavaScript emitido; por isso o build é `nest build && tsc-alias -p tsconfig.build.json`.
