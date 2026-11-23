# Qualidade de código, TypeScript 6 e editores

**Referência:** [currency-converter-web](https://github.com/aqu1no1/currency-converter-web) · Configuração inicial adaptada ao NestJS.

## Ferramentas Oxc
- `pnpm lint`: Oxlint com regras type-aware e falha em warnings.
- `pnpm lint:fix`: correções seguras do Oxlint.
- `pnpm format`: formatação com Oxfmt.
- `pnpm format:check`: verifica a formatação sem alterar arquivos.
- `pnpm typecheck`: TypeScript 6 sem emitir arquivos.
- `pnpm pr`: valida lint + formatação + tipos.

O `package.json` contém **apenas ferramental inicial**. Durante o bootstrap da API, instalar NestJS, PostgreSQL/TypeORM, Vitest, ts-node, tsconfig-paths, tsc-alias e demais dependências; gerar e commitar `pnpm-lock.yaml`. Não é ainda uma aplicação executável.

## Imports @/ na API

`tsconfig.json` mapeia `@/*` para `./src/*` sem `baseUrl` (depreciado no TS 6). NestJS com decorators requer `experimentalDecorators` e `emitDecoratorMetadata`, portanto **não** habilitar `erasableSyntaxOnly`. `module: Node20` / `moduleResolution: Node16` compila módulos CommonJS enquanto `package.json` não tiver `type: module`.

O TypeScript não reescreve os aliases no JS compilado. Durante o bootstrap:

1. Instalar `tsc-alias` e incluir `tsc-alias -p tsconfig.build.json` depois de `nest build`.
2. Configurar `tsconfig-paths/register` no modo dev para resolver aliases ao executar TS.
3. Confirmar que `node dist/main.js` funciona, inclusive fora do editor.
4. Vitest já possui mapeamento `@/` em `vitest.config.ts`.

## Editores

As configurações compartilhadas estão em `.vscode/` e `.zed/`, com Oxc para lint/format e sugestões de import não relativo no VS Code. Evitar commitar preferências pessoais de editor.

## Idiomas

O AcadFlow usa somente `pt-BR` (padrão) e `en`. O checklist de PR cobra `pt-BR`; novas traduções devem ser adicionadas também em `en`.
