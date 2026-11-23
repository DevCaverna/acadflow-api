# Padrão de migrations TypeORM (pnpm)

Scripts planejados no `package.json` da API:

- `migration:create`: `node scripts/migration-create.mjs`
- `migration:show`: `typeorm-ts-node-esm migration:show -d ./src/database/data-source.ts`
- `migration:run`: `typeorm-ts-node-esm migration:run -d ./src/database/data-source.ts`
- `migration:revert`: `typeorm-ts-node-esm migration:revert -d ./src/database/data-source.ts`
- `migration:run:prod`: `typeorm migration:run -d ./dist/database/data-source.js`

Exemplo: `pnpm migration:create CreateUsersTable`, preencher `up()` e `down()`, conferir `pnpm migration:show`, rodar `pnpm migration:run`.

A criação recebe timestamp automático do CLI. `DB_*` é lido em runtime. Usar `synchronize: false`; `migration:run:prod` somente em etapa única de release e após conferir caminho de `dist`. Não fazer revert em produção sem análise de dados.

Ainda é necessário adicionar dependências (TypeORM, pg, ts-node, dotenv) e scripts no package.json com o bootstrap NestJS. O arquivo de script foi preparado em `scripts/`.
