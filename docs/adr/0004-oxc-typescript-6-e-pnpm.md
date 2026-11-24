# ADR-0004: Adoção de Oxlint, Oxfmt, TypeScript 6 e pnpm 12

- **Status:** Aceita
- **Data:** 2026-11-23
- **Arquivos relacionados:** `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.json`, `package.json`, `docs/qualidade-e-editores.md`

## Contexto

Projetos NestJS frequentemente acumulam dezenas de plugins ESLint e Prettier que tornam a verificação local e o pipeline de CI lentos, além de exigir configuração complexa para regras type-aware e decorators.

## Decisão

Padronizar os repositórios de código (`acadflow-api` e `acadflow-web`) com:

- **pnpm 12.4.2** para instalação determinística (`--frozen-lockfile`) e menor uso de disco.
- **TypeScript 6 (`strict: true`)** com `experimentalDecorators` e `emitDecoratorMetadata` (obrigatórios para NestJS/TypeORM) e reescrita de alias `@/` no build via `tsc-alias`.
- **Oxlint** (com `oxlint-tsgolint` `--type-aware --deny-warnings`) e **Oxfmt** em substituição ao par ESLint + Prettier.
- **Vitest 5** + `unplugin-swc` para testes unitários, integração e E2E com execução rápida e suporte nativo a TypeScript/decorators.

## Alternativas Consideradas

- **ESLint + Prettier + Jest:** ecossistema tradicional do NestJS, porém significativamente mais lento em CI e com maior carga de manutenção de plugins.

## Consequências

- **Positivas:** `pnpm pr` (`lint`, `format:check`, `typecheck`, `test:unit`, `build`) executa em segundos; consistência completa de tooling entre backend e frontend.
- **Negativas:** exige configuração de extensão Oxc no VS Code ou Zed (`.vscode/` e `.zed/` já versionados) para feedback instantâneo no editor.
