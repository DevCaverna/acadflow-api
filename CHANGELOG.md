# Changelog

Todas as mudanças notáveis da **AcadFlow API** são documentadas neste arquivo, seguindo o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Adicionado

- Documentação completa da API: arquitetura real com diagramas Mermaid, dicionário de dados em [docs/banco-de-dados.md](docs/banco-de-dados.md), ADRs (`docs/adr/`), regras de negócio e matriz RBAC ([docs/regras-de-negocio.md](docs/regras-de-negocio.md)), guia de segurança ([docs/seguranca.md](docs/seguranca.md)), guia de Swagger ([docs/swagger.md](docs/swagger.md)), guia de storage/operação ([docs/storage-e-operacao.md](docs/storage-e-operacao.md)), guia full-stack local ([docs/execucao/fullstack-local.md](docs/execucao/fullstack-local.md)) e coleção HTTP ([docs/http/acadflow-api.http](docs/http/acadflow-api.http)).
- Metadados OpenAPI enriquecidos no Swagger (`/docs`) com descrição, versão, tags de todos os módulos, `persistAuthorization` e `@ApiOperation` em `GET /health`.
- Governança: `CHANGELOG.md`, `SECURITY.md`, `LICENSE`, `.github/CODEOWNERS`, `.github/dependabot.yml` e Plano de Gerência de Configuração ([docs/gerencia-de-configuracao.md](docs/gerencia-de-configuracao.md)).

### Em andamento em branches de feature (não mergeadas em `develop`/`main`)

- **`feature/ACA-24-profile-api`:** edição de perfil (`GET`/`PATCH /users/me`), alteração de senha (`PATCH /users/me/password`), CLI `pnpm user:create`, padronização em `TZ=UTC`, rate limiting de login (`429 TOO_MANY_REQUESTS`) e matrículas manuais (`GET .../candidates`, `POST`/`DELETE .../students/:studentId`).
- **`feature/ACA-25-storage-api`:** integração com Cloudflare R2 privado, processamento de avatares via Sharp (WebP 256×256), anexos de atividades (`activity_attachments` + URLs pré-assinadas) e exposição de `updatedAt` nas notas.

## [0.1.0] - 2026-11-24

### Adicionado

- Bootstrap NestJS 12 + TypeScript 6 (`strict`) + PostgreSQL 17 + TypeORM (`synchronize: false`).
- Migrations manuais (`InitialSchema` e `UseUuidV7` com `public.uuid_generate_v7()`) e seeds idempotentes (`pnpm seed`).
- Autenticação JWT (HS256) com `bcryptjs`, mitigação de timing attack na enumeração de e-mails e guards `@Auth(...roles)`.
- Módulos MVP completos: `health`, `auth`, `users`, `disciplines` (CRUD + paginação `Listing<T>`), `enrollments` (listagem de alunos), `activities` (CRUD) e `grades` (lançamento idempotente + cálculo de médias em décimos inteiros e status `NO_GRADES`/`APPROVED`/`RECOVERY`/`FAILED`).
- Internacionalização com `nestjs-i18n` (`pt-BR` padrão e `en`) e contrato global de erros `{ statusCode, code, message }`.
- Suíte de testes unitários, de integração e E2E com Vitest + Supertest + Docker PostgreSQL isolado por worker.
- Workflows de CI/CD com Oxlint/Oxfmt, Trivy, Cosign/OIDC, SBOM SPDX e deploy na VPS por digest.
