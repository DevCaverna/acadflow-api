# Execução Full-Stack Local (PostgreSQL + API + Web)

Este guia descreve como subir os serviços do **AcadFlow** em conjunto na máquina local para testar fluxos reais ponta a ponta.

---

## Pré-requisitos

- **Node.js 24** e **pnpm 12.4.2**
- **Docker Engine + Compose v2** (ou PostgreSQL 17 instalado no host)
- Repositórios irmãos clonados na mesma pasta (ex.: `acadflow-api` e `acadflow-web`)

---

## 1. Versão para desenvolvimento local

Use `main` atualizada nos dois repositórios. Os endpoints de perfil, matrícula manual, avatares e anexos já estão integrados na API. Com `R2_ENABLED=false`, os uploads retornam `503 STORAGE_UNAVAILABLE`.

---

## 2. Subir PostgreSQL e `acadflow-api`

### Opção A — Via Docker Compose (recomendada)

Na pasta `acadflow-api`:

```bash
cp .env.example .env
```

Edite o `.env` garantindo:

- `JWT_SECRET` com uma string aleatória longa
- `SEED_PASSWORD` com pelo menos 8 caracteres (ex.: `change-me-1234`)
- `CORS_ORIGIN=http://localhost:5173`
- `DB_HOST=postgres` (para os containers do Compose; no host, o PostgreSQL fica publicado em `127.0.0.1:5433` via `DB_HOST_PORT`)

Suba banco e API, aplique migrations e rode o seed demo:

```bash
docker compose --env-file .env -f docker/compose.dev.yml up -d --build
docker compose --env-file .env -f docker/compose.dev.yml exec api pnpm migration:run
docker compose --env-file .env -f docker/compose.dev.yml exec api pnpm seed
```

### Opção B — PostgreSQL local + API no host

```bash
cp .env.example .env
# Ajuste DB_HOST=localhost, DB_PORT=5432, JWT_SECRET, SEED_PASSWORD e CORS_ORIGIN=http://localhost:5173
pnpm install --frozen-lockfile
pnpm migration:run
pnpm seed
pnpm start:dev
```

Valide a API antes de iniciar o frontend:

- Health check: `http://localhost:3000/health` (`200 { "status": "ok" }`)
- Swagger UI: `http://localhost:3000/docs`

---

## 3. Subir `acadflow-web`

Na pasta `acadflow-web`:

```bash
cp .env.example .env
# Confirme VITE_API_BASE_URL=http://localhost:3000
pnpm install --frozen-lockfile
pnpm dev
```

Acesse **`http://localhost:5173`** no navegador.

> Como o Axios roda no navegador do usuário, `VITE_API_BASE_URL` deve apontar para `http://localhost:3000` (acessível pelo host), nunca para um nome de serviço interno do Docker como `http://api:3000`.

---

## 4. Contas Demo e Smoke Test Ponta a Ponta

As contas criadas por `pnpm seed` usam a senha definida em `SEED_PASSWORD`:

| Perfil      | E-mail                     | Disciplina inicial                   |
| ----------- | -------------------------- | ------------------------------------ |
| `PROFESSOR` | `professor@acadflow.local` | `BD-204` — Banco de Dados (`2026.2`) |
| `ALUNO`     | `aluno@acadflow.local`     | Matriculado em `BD-204`              |
| `ALUNO`     | `aluna@acadflow.local`     | Matriculado em `BD-204`              |

### Roteiro de Verificação Manual

1. Entre como `professor@acadflow.local` em `http://localhost:5173/login`.
2. Verifique a listagem da disciplina `BD-204` e acesse os detalhes da disciplina.
3. Crie uma nova atividade (ela fica visível imediatamente, sem status de rascunho).
4. Acesse **Lançar notas**, preencha uma nota entre `0,0` e `10,0` para `aluno@acadflow.local` e salve.
5. Saia, entre como `aluno@acadflow.local` e confirme a nova atividade e o cálculo da média parcial/situação em **Notas e média**.

---

## 5. Problemas Comuns na Integração

- **Erro de CORS no navegador:** confirme `CORS_ORIGIN=http://localhost:5173` na API (sem barra `/` no final) e reinicie a API.
- **Porta 5432 ocupada no host:** no `compose.dev.yml`, a porta publicada do PostgreSQL é controlada por `DB_HOST_PORT` (padrão `5433`).
- **`acadflow-web` sem `package.json`:** confirme que está na raiz do repositório e que a cópia local de `main` está atualizada.
- **404 nas rotas de perfil, matrículas ou anexos:** verifique se a API está em uma branch que contenha `ACA-24`/`ACA-25`.
