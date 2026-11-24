# Storage (Cloudflare R2) e Operação Administrativa

Este guia cobre as operações administrativas e de armazenamento de arquivos introduzidas nas branches pós-MVP **`feature/ACA-24-profile-api`** e **`feature/ACA-25-storage-api`**.

> Perfil e storage já estão integrados em `main`. Avatares e anexos exigem R2 configurado; o storage permanece desabilitado por padrão (`R2_ENABLED=false`).

---

## 1. Gerenciamento de Usuários via CLI (`ACA-24`)

Como não há cadastro público aberto no sistema, contas administrativas ou de professores adicionais podem ser criadas via CLI fora dos seeds demo.

### Desenvolvimento

```bash
USER_PASSWORD='sua-senha-segura' pnpm user:create \
  --name "Profa. Marina Costa" \
  --email "marina@acadflow.local" \
  --role PROFESSOR
```

### Produção (dentro do container compilado)

```bash
USER_PASSWORD='sua-senha-segura' pnpm user:create:prod \
  --name "Profa. Marina Costa" \
  --email "marina@acadflow.local" \
  --role PROFESSOR
```

- A senha é lida exclusivamente da variável de ambiente `USER_PASSWORD` (nunca via argumento de linha de comando, evitando vazamento em histórico de shell e `ps`).
- Papéis aceitos: `PROFESSOR` ou `ALUNO`.

---

## 2. Configuração do Cloudflare R2 (`ACA-25`)

O AcadFlow utiliza um **bucket privado** no Cloudflare R2 (compatível com S3) para armazenar:

1. **Avatares de usuário:** convertidos no servidor via Sharp para **WebP 256×256** (limite de entrada: `PNG`, `JPEG` ou `WebP` de até `2 MB`).
2. **Anexos de atividades:** materiais de apoio enviados pelo professor (limite: `PDF`, `PNG` ou `JPG` de até `10 MB`).

### Variáveis de Ambiente

| Variável               | Exemplo / Padrão                             | Descrição                                                                                                   |
| ---------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `R2_ENABLED`           | `false` / `true`                             | Habilita o `R2StorageService`. Quando `false`, rotas de upload/download retornam `503 STORAGE_UNAVAILABLE`. |
| `R2_BUCKET_NAME`       | `acadflow-files-prod`                        | Nome do bucket privado (use buckets distintos para dev/staging/prod).                                       |
| `R2_ACCESS_KEY_ID`     | _(secret)_                                   | Access Key ID do token S3 da Cloudflare com permissão de leitura/escrita apenas no bucket alvo.             |
| `R2_SECRET_ACCESS_KEY` | _(secret)_                                   | Secret Access Key correspondente.                                                                           |
| `R2_ENDPOINT`          | `https://<account>.r2.cloudflarestorage.com` | Endpoint S3 sem o nome do bucket. Obrigatório quando `R2_ENABLED=true`.                                     |
| `AVATAR_MAX_BYTES`     | `2097152` (2 MB)                             | Tamanho máximo permitido para upload de avatar.                                                             |
| `ATTACHMENT_MAX_BYTES` | `10485760` (10 MB)                           | Tamanho máximo permitido para upload de anexo de atividade.                                                 |

### Checklist de Provisionamento do Bucket

1. Criar um bucket **privado** no Cloudflare R2 (sem acesso público/Custom Domain aberto).
2. Gerar um API Token restrito ao bucket com permissões `Object Read & Write`.
3. Se os downloads via URL pré-assinada forem abertos ou buscados pelo navegador, configurar a política de **CORS** do bucket permitindo `GET` a partir da mesma origem configurada em `CORS_ORIGIN`.
4. Cadastrar `R2_ENABLED=true`, `R2_BUCKET_NAME` e `R2_ENDPOINT` como Variables, e `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` como Secrets no GitHub Environment da API. A aplicação não usa `R2_ACCOUNT_ID` separadamente.

---

## 3. Regras Operacionais e Fuso Horário

- **URLs pré-assinadas:** `avatarUrl` (em `GET /auth/me` e `GET /users/me`) e `GET /attachments/:id/url` expiram em **5 minutos**. O cliente não deve persistir essas URLs em cache de longa duração.
- **Exclusão de atividade com anexos:** enquanto houver registros em `activity_attachments`, `DELETE /activities/:id` retorna `409 CONFLICT` (`ON DELETE RESTRICT`). Remova os anexos antes de excluir a atividade.
- **Padronização em UTC (`ACA-24`):** API (`TZ=UTC`) e PostgreSQL operam sempre em UTC. O frontend converte e formata datas para o fuso e idioma do navegador.
- **Modo degradado seguro:** caso `R2_ENABLED=false`, toda a operação acadêmica principal (login, disciplinas, atividades sem anexos, notas e médias) continua funcionando normalmente; apenas uploads/URLs assinadas respondem `503 STORAGE_UNAVAILABLE`.
