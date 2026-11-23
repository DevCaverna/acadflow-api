# AcadFlow API — Testes PostgreSQL, Vitest e Docker

**Padrão:** unitários em src, integração em test/integration e E2E em test/e2e. PostgreSQL 17, uma database por worker e migrations TypeORM; nunca usar synchronize: true.

## Comandos

- pnpm test:unit / pnpm test:unit:watch — sem Docker
- pnpm test:docker — integração + E2E, até 4 workers
- pnpm test:docker 2 — integração + E2E, até 2 workers
- pnpm test:integration:docker 2 — integração, até 2 workers
- pnpm test:e2e:docker 1 — E2E, um worker
- pnpm test:cov — cobertura dos unitários

## Infraestrutura

O wrapper scripts/run-docker-tests.mjs usa o Compose docker/compose.test.yml com PostgreSQL 17 sem expor portas e um projeto Compose exclusivo. O arquivo test/support/setup/prepare-test-dbs.mjs cria acadflow_test_1..N e aplica migrations TypeORM. Cada worker seleciona seu banco via VITEST_POOL_ID. A limpeza do projeto Docker ocorre após execução (inclusive erros normais). Falhas abruptas podem exigir remoção manual do projeto temporário.

Copie .env.test.example para .env.test se quiser alterar as credenciais descartáveis. Nunca referencie DB de dev/prod nos testes. Banco é removido após os testes, e o setup bloqueia host distinto de postgres. Testes sequenciais no mesmo worker ainda devem limpar seus dados.

**ATENÇÃO:** scaffold inicial — dependências NestJS, Vitest, pg, Supertest, TypeORM, docker e lockfile ainda precisam ser adicionados pelo bootstrap API. Não tratar CI como funcional até concluir e testar esses scripts.

## Git e ambientes

PRs para develop, staging e main rodam qualidade + testes + build. O workflow .github/workflows/ci.yml chama pnpm test:unit e pnpm test:docker 2, depois permite o job Build; build não é deploy.
