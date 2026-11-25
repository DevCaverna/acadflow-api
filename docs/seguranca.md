# Segurança — AcadFlow API

Este documento descreve os controles de segurança implementados na **AcadFlow API**, incluindo autenticação, autorização, validação de entrada, proteção de dados e cadeia de entrega em produção.

---

## 1. Autenticação e Sessão JWT

- **Algoritmo e segredo:** tokens de acesso assinados com **HS256** (`JwtModule`). A variável `JWT_SECRET` é obrigatória na inicialização via `configService.getOrThrow('JWT_SECRET')`, impedindo o startup com segredo ausente.
- **Expiração curta:** `JWT_ACCESS_EXPIRES_IN` possui padrão de `15m`.
- **Payload mínimo:** o token carrega apenas `{ sub: user.id }`. O papel (`PROFESSOR` | `ALUNO`) **não** é confiado a partir de claims ou headers do cliente; `JwtStrategy` consulta o usuário atualizado no PostgreSQL a cada requisição autenticada. Se o usuário não existir mais, retorna `401 UNAUTHORIZED`.

## 2. Proteção de Senhas e Prevenção de Enumeração

- **Hashing:** senhas são armazenadas exclusivamente como hash `bcryptjs` com fator de custo `BCRYPT_ROUNDS = 10` (`src/config/security.constants.ts`).
- **Limite do bcrypt (72 bytes):** o DTO de login (`LoginDto`) e os fluxos de criação/alteração de senha limitam a entrada a 72 caracteres/bytes UTF-8 para evitar truncamento silencioso característico do algoritmo `bcrypt`.
- **Seleção explícita:** a coluna `password_hash` possui `select: false` na entidade `User`, só sendo carregada no fluxo de autenticação. Nenhum DTO de resposta inclui `passwordHash`.
- **Mitigação de timing attack na enumeração de e-mails:** em `AuthService.login()`, quando o e-mail não é encontrado no banco, a API ainda executa `bcrypt.compare(password, placeholderHash)` antes de lançar `401 INVALID_CREDENTIALS`, equalizando o tempo de resposta e exibindo sempre a mesma mensagem genérica.
- **Rate limit de login _(branch `ACA-24`)_:** `LoginAttemptsService` bloqueia após **5 tentativas falhas em 15 minutos** por par `(ip, lower(email))` com `429 TOO_MANY_REQUESTS`, limpando o contador após login válido e limitando o mapa em memória a 10.000 entradas com limpeza de expirados.

## 3. Autorização em Camadas (RBAC + Ownership)

- **Guards globais por rota (`@Auth(...roles)`):** combina `JwtAuthGuard`, `RolesGuard` e `@ApiBearerAuth()`. Sem papel especificado, exige usuário autenticado; com papel (`@Auth('PROFESSOR')` ou `@Auth('ALUNO')`), bloqueia outros papéis com `403 FORBIDDEN`.
- **Autorização de recurso no service:** toda operação em disciplina, atividade, matrícula ou nota verifica ownership do professor (`findOwnedOrFail`) ou vínculo de matrícula do aluno (`findVisibleOrFail`, `assertCanGrade`). Um professor não lê nem altera dados de outro professor.

## 4. Validação de Entrada, SQL Injection e Tratamento de Erros

- **`ValidationPipe` global (`src/app.module.ts`):**
  - `whitelist: true` remove campos não declarados no DTO.
  - `transform: true` e `stopAtFirstError: true`.
  - `validationError: { target: false, value: false }` evita ecoar valores inválidos (como senhas) em logs/erros.
- **Paginação segura (`ValidatePaginationPipe`):** faz parse seguro do parâmetro JSON `filter` com `forbidNonWhitelisted: true` e valida `sortField` contra a whitelist do recurso (`code`, `name`, `semester`), bloqueando ordenação por campos arbitrários.
- **Prevenção de SQL Injection:** todas as queries com filtros ou joins usam TypeORM `QueryBuilder` com parâmetros nomeados (`:search`, `:semester`, `:userId`). Na busca textual `ILIKE`, os metacaracteres `%`, `_` e `\` são escapados antes da consulta (`filter.search.replace(/[\\%_]/g, '\\$&')`).
- **Higiene de erros (`ApiExceptionFilter`):** exceções internas e erros de banco são registrados apenas no `Logger` do servidor; a resposta HTTP retorna exclusivamente `{ statusCode, code, message }` traduzido por `nestjs-i18n`, sem stack traces, nomes de tabelas ou queries SQL.

## 5. Infraestrutura, Runtime e Cadeia de Entrega

- **CORS explícito:** configurado em `src/main.ts` a partir de `CORS_ORIGIN` (padrão local `http://localhost:5173`), devendo apontar para a origem HTTPS pública do frontend em staging/produção.
- **Cadastro público:** o perfil e o e-mail são autodeclarados. Use um canal conhecido para confirmar a identidade de um aluno antes de matricular sua conta. Não há verificação nem recuperação de senha por e-mail.
- **Seeds bloqueados em produção:** `src/database/seeds/run-seed.ts` recusa execução se `NODE_ENV === 'production'`.
- **Migrations fora do startup:** `synchronize: false` e `migrationsRun: false` evitam mutação de esquema durante o boot de réplicas; migrations produtivas rodam em etapa isolada antes da troca do container (`scripts/deploy-api.sh`).
- **Container sem root:** a imagem de produção (`docker/Dockerfile`) executa o processo Node.js com `USER node` (não root) e banco de testes em `docker/compose.test.yml` roda em `tmpfs` sem expor porta no host.
- **Supply chain no CI/CD:** imagens publicadas no GHCR passam por scan **Trivy** (bloqueio de vulnerabilidades críticas), geração de **SBOM SPDX** e assinatura com **Cosign / OIDC**, sendo promovidas entre ambientes pelo mesmo `sha256` digest.
- **Proteção de uploads _(branch `ACA-25`)_:** buckets privados no Cloudflare R2, verificação de MIME real via assinatura de bytes (`file-type.ts`), re-encodificação de avatares para WebP 256×256 com Sharp (removendo metadados) e download de anexos apenas via URL pré-assinada de 5 minutos emitida após validação de vínculo.
