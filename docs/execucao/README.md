# Como executar o AcadFlow API

## Pré-requisitos

- Node.js **24** e pnpm **12.4.2**, ou Docker Engine com Compose v2.
- PostgreSQL **17** (direto na máquina ou pelo Docker Compose).
- Acesso ao repositório `acadflow-api` e `.env` criado a partir de `.env.example`.

## Rodar a API diretamente no host

```bash
cp .env.example .env
# Se o PostgreSQL estiver no host, DB_HOST=localhost e DB_PORT=5432 ou porta configurada.
pnpm install
pnpm migration:show
pnpm migration:run
pnpm seed   # usuários de demonstração; definir SEED_PASSWORD no .env
pnpm start:dev
```

A API estará em `http://localhost:3000` (salvo configuração diversa). Swagger em `/docs` e estado da API e do banco em `/health` (`503` se o banco estiver indisponível). A migration é uma ação explícita: não rodar `migration:run` indiscriminadamente sem confirmar o banco.

## Rodar API e PostgreSQL pelo Docker

```bash
cp .env.example .env
# Ajustar .env com valores locais descartáveis.
docker compose --env-file .env -f docker/compose.dev.yml up --build
```

O serviço API usa `DB_HOST=postgres` **dentro** do Compose. A porta do host do PostgreSQL pode ser `5433` para evitar conflito com uma instância já instalada; dentro dos containers continua sendo `5432`. A API usa porta `3000`. Deixar as migrations como etapa explícita:

```bash
docker compose --env-file .env -f docker/compose.dev.yml exec api pnpm migration:run
```

Encerrar sem apagar dados persistidos:

```bash
docker compose --env-file .env -f docker/compose.dev.yml down
```

Apagar volumes de **desenvolvimento** somente quando for intencional descartar o banco:

```bash
docker compose --env-file .env -f docker/compose.dev.yml down --volumes
```

## Executar testes

```bash
pnpm test:unit
pnpm test:docker       # até 4 workers; Docker/PostgreSQL temporários
pnpm test:docker 2     # até 2 workers
pnpm test:integration:docker 2
pnpm test:e2e:docker 1
```

Os testes de integração/E2E não usam o PostgreSQL de desenvolvimento; o wrapper cria um projeto Compose isolado, aplica migrations em bancos próprios e executa `down --volumes --remove-orphans` ao final.

## Verificação antes de uma PR

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm build
```

O CI também executa os testes de integração e E2E isolados.

## Problemas comuns

- **Conexão recusada:** conferir `DB_HOST`, `DB_PORT` e healthcheck do Postgres; no Docker use `postgres`, no host use `localhost`.
- **Porta ocupada:** ajustar porta publicada no host sem mudar a porta interna PostgreSQL `5432`.
- **Tabela ausente:** executar migrations **no banco correto**, não usar `synchronize: true`.
- **Alias `@/` falha em `dist`:** revisar `tsc-alias` e script de build.
- **Arquivos i18n ausentes em produção:** garantir cópia das pastas de tradução no build Nest.
- **Volume com dados antigos:** só apagar explicitamente quando for seguro perder esses dados.

## Ambientes Git

Desenvolver em `feature/ACA-...`, integrar em `develop`, homologar em `staging` e estabilizar em `main`. **Branch não equivale automaticamente a deploy.**
