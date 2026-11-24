# Padrão de migrations TypeORM (pnpm)

| Script                       | O que faz                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| `pnpm migration:create Nome` | Cria o arquivo com timestamp em `src/database/migrations/` |
| `pnpm migration:show`        | Lista executadas e pendentes                               |
| `pnpm migration:run`         | Executa as pendentes                                       |
| `pnpm migration:revert`      | Desfaz só a última                                         |
| `pnpm migration:run:prod`    | Executa as pendentes com o `dist/` já compilado, sem build |

`show`, `run` e `revert` compilam o projeto e usam `dist/database/data-source.js`, o mesmo código que roda em produção. `run:prod` não compila: a imagem de produção já traz o `dist/` e não tem as dependências de desenvolvimento.

Exemplo: `pnpm migration:create CreateUsersTable`, preencher `up()` e `down()`, conferir `pnpm migration:show`, rodar `pnpm migration:run`. O arquivo gerado segue o modelo do TypeORM; rodar `pnpm format` depois de preencher.

A criação recebe timestamp automático do CLI e aceita só um nome simples, sem caminho. `DB_*` é lido em runtime; o `.env` não sobrescreve variáveis já definidas. `synchronize` e `migrationsRun` ficam `false`: subir a API, em uma ou várias réplicas, nunca altera o esquema.

## Antes de `run` ou `revert`

1. Conferir `DB_HOST` e `DB_DATABASE`.
2. Rodar `pnpm migration:show` (`[X]` executada, `[ ]` pendente).
3. Testar `revert` só em banco descartável: o `down()` de `InitialSchema` apaga as cinco tabelas e seus dados.

## Produção

Aplicar em uma etapa única de release, antes de atualizar as réplicas, com backup recente. A imagem não inclui pnpm; usar o npm que vem com o Node:

```bash
docker run --rm --env-file <arquivo-do-ambiente> <imagem> npm run migration:run:prod
```

Não há `migration:revert:prod`. Para corrigir produção, preferir uma nova migration; revert exige análise de dados e aprovação.

No deploy pelo GitHub Actions, confira o host e o nome do banco configurados no Environment antes de aprovar. O [comando remoto](execucao/deploy.md) usa a imagem aprovada e impede deploys concorrentes no mesmo ambiente. O rollback da aplicação não desfaz migrations.

## Testes

`test/integration/migration-cli.int-spec.ts` usa um banco próprio no PostgreSQL temporário para verificar o ciclo show → run → revert → run com o `dist/` e confirma que duas instâncias da API não aplicam migrations ao iniciar.

## Import aliases e build

O TypeScript não reescreve os imports `@/` no JavaScript emitido; por isso o build é `nest build && tsc-alias -p tsconfig.build.json`.
