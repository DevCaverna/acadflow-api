# AcadFlow API — CI/CD

Branches temporárias partem de `main` e voltam para `main` por PR com revisão.
O workflow `.github/workflows/ci.yml` valida PRs para `main` e pushes em `main`.

Node 24 + pnpm 12.4.2, pnpm install --frozen-lockfile, pnpm lint (Oxlint), pnpm format:check (Oxfmt), pnpm typecheck, pnpm test:unit (Vitest) e pnpm test:docker 2 (PostgreSQL 17 em Compose isolado).
Job API / Build depende do job API / Validate. O artefato dist/ é publicado somente após validação bem-sucedida; não é deploy em produção.
Docker Compose tem projeto isolado, nenhum mapeamento de porta 5432 e remove volumes no fim. Sem segredos reais em CI.

Proteja `main` com PR obrigatório, pelo menos uma revisão e os checks `API / Validate` e `API / Build`. O workflow sozinho não protege a branch.

Para publicar e promover uma imagem Docker sem reconstrução, siga o [guia de releases e deploy](execucao/deploy.md). Nenhum push dispara deploy.
