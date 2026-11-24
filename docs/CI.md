# AcadFlow API — CI/CD

Branches: feature/* → develop → staging → main, por Pull Requests com review.
A workflow .github/workflows/ci.yml valida PRs e pushes nas três branches.

Node 24 + pnpm 12.4.2, pnpm install --frozen-lockfile, pnpm lint (Oxlint), pnpm format:check (Oxfmt), pnpm typecheck, pnpm test:unit (Vitest) e pnpm test:docker 2 (PostgreSQL 17 em Compose isolado).
Job API / Build depende do job API / Validate. O artefato dist/ é publicado somente após validação bem-sucedida; não é deploy em produção.
Docker Compose tem projeto isolado, nenhum mapeamento de porta 5432 e remove volumes no fim. Sem segredos reais em CI.

Proteger develop, staging e main com PR obrigatório, ao menos 1 review e checks API / Validate e API / Build. Workflow sozinho não protege branch.

Para publicar e promover uma imagem Docker sem reconstrução, siga o [guia de releases e deploy](execucao/deploy.md). Nenhum push dispara deploy.
