# ADR-0005: Storage privado no Cloudflare R2 com URLs pré-assinadas e Sharp

- **Status:** Aceita (Pós-MVP — implementada em `feature/ACA-25-storage-api`)
- **Data:** 2026-11-24
- **Arquivos relacionados:** `src/modules/storage/`, `src/database/migrations/1795528902392-CreateActivityAttachments.ts`

## Contexto

As funcionalidades pós-MVP de **foto de perfil** (`PerfilFoto`) e **anexos de atividades** (`AtividadeAnexos`) exigem armazenamento persistente de binários fora do container da API (que é stateless) sem expor dados de alunos e materiais acadêmicos em URLs públicas permanentes.

## Decisão

1. Armazenar avatares e anexos em um **bucket privado no Cloudflare R2** (API S3-compatível via `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`), mantendo as credenciais exclusivamente no backend.
2. Processar avatares no servidor com **Sharp**, convertendo para **WebP 256×256** (removendo metadados EXIF e padronizando dimensões) antes do envio ao R2, com limite de `2 MB` (PNG/JPG/WebP).
3. Validar anexos de atividades no servidor (assinatura/magic bytes, PDF/PNG/JPG até `10 MB`) e autorizar downloads via **URL pré-assinada temporária** (`GET /attachments/:id/url`) somente após checar vínculo do professor ou matrícula do aluno.
4. Quando `R2_ENABLED=false`, registrar `DisabledStorageService` e retornar `503 STORAGE_UNAVAILABLE` nas rotas de upload/download, mantendo o restante da API operacional em ambiente local.

## Alternativas Consideradas

- **Armazenamento em disco local do container:** incompatível com deploys stateless e recriação de containers em produção.
- **Bucket público com CDN:** exporia materiais de turma e fotos de usuários sem controle de autorização por matrícula.

## Consequências

- **Positivas:** controle de acesso verificado no backend antes de emitir links temporários, zero tráfego de download pesado passando pelo Node.js após emissão da URL assinada e operação degradada segura quando R2 não está configurado.
- **Negativas:** requer configuração de bucket R2 e política de CORS no provedor quando habilitado em staging/produção.
