# Padrão de migrations TypeORM (pnpm)

Scripts planejados no `package.json` da API:

- `migration:create`: `node scripts/migration-create.mjs`
- `migration:show`: `typeorm-ts-node-commonjs migration:show -d ./src/database/data-source.ts`
- `migration:run`: `typeorm-ts-node-commonjs migration:run -d ./src/database/data-source.ts`
- `migration:revert`: `typeorm-ts-node-commonjs migration:revert -d ./src/database/data-source.ts`
- `migration:run:prod`: `typeorm migration:run -d ./dist/database/data-source.js`

Exemplo: `pnpm migration:create CreateUsersTable`, preencher `up()` e `down()`, conferir `pnpm migration:show`, rodar `pnpm migration:run`.

A criação recebe timestamp automático do CLI. `DB_*` é lido em runtime. Usar `synchronize: false`; `migration:run:prod` somente em etapa única de release e após conferir caminho de `dist`. Não fazer revert em produção sem análise de dados.

Ainda é necessário adicionar dependências (TypeORM, pg, ts-node, dotenv) e scripts no package.json com o bootstrap NestJS. O arquivo de script foi preparado em `scripts/`.

## Import aliases e build

A API usa imports `@/` mapeados para `src/*` em `tsconfig.json`. O `paths` do TypeScript **não altera** os imports JavaScript no output. Na configuração CommonJS proposta, instalar `tsc-alias` como dependência de desenvolvimento e adicionar ao `package.json`: `"build": "nest build && tsc-alias -p tsconfig.build.json"`. Validar também `@/` no desenvolvimento e que o processo compilado não mantém imports com `@/`.

**Decisão de compatibilidade:** o scaffolding inicial usa TypeScript CommonJS para simplificar execução e migrations. Não combinar os scripts CommonJS acima com package TypeScript ESM/NodeNext sem revisar o runner e os imports. O projeto ainda não tem `package.json` nem `DataSource` implementados; os comandos são uma especificação a validar.
