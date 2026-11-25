# Releases e deploy da API

O GitHub Actions publica imagens Linux `amd64` no GHCR. Os deploys em `development`, `staging`
e `production` são independentes. Na VPS, a API usa Docker Engine diretamente, sem Compose
e sem checkout. O PostgreSQL, os backups, o proxy, o HTTPS e o provisionamento dos hosts são
externos ao projeto.

## Primeira configuração

Os workflows de entrega precisam existir na branch padrão (`main`). A entrega é acionada
manualmente; um push ou uma execução da CI não publica nem implanta imagens por si só.

1. Proteja `main` com revisão e CI obrigatórios. Configure regras para
   impedir alteração/exclusão de tags `v*`, preservando a criação pelo workflow. Restrinja alterações
   nos workflows de entrega a PRs revisados. Se um ruleset bloquear o push de release em `main`,
   configure a autorização da automação de release sem desativar a proteção para alterações comuns.
2. Em **Settings → Environments** no GitHub, crie `development`, `staging` e `production`.
   Permita deploy apenas a partir de `main` (é a ref do workflow, não a ref da imagem). Em
   `production`, configure revisores obrigatórios, impeça autoaprovação e desabilite bypass
   administrativo. O workflow recusa produção sem revisores ou se o solicitante puder
   autoaprovar. Não disponibilize chaves SSH no nível do repositório.
3. Em cada Environment, configure as variables e secrets da tabela abaixo. Na mesma VPS,
   `DEPLOY_HOST`, `DEPLOY_PORT` e `DEPLOY_KNOWN_HOSTS` podem ser iguais; use uma chave SSH,
   uma porta HTTP local e um banco distintos por ambiente.
4. O GHCR precisa permitir publicação e leitura pelo GitHub Actions deste repositório.
   O pull na VPS usa o `GITHUB_TOKEN` do job (`packages: read`), inclusive para pacote
   privado. Não cadastre outro secret nem faça login persistente na VPS: o token segue
   pelo SSH e a configuração temporária do Docker é removida depois do pull.
   Não remova do GHCR a imagem, a assinatura nem a atestação de versões que ainda podem ser
   implantadas.

| Tipo     | Nome                     | Valor                                                                             |
| -------- | ------------------------ | --------------------------------------------------------------------------------- |
| Variable | `DEPLOY_HOST`            | DNS ou IPv4 da VPS.                                                               |
| Variable | `DEPLOY_PORT`            | Porta SSH; padrão `22`.                                                           |
| Variable | `DEPLOY_SSH_USER`        | Usuário Linux para o login SSH; padrão `admin`.                                   |
| Variable | `API_HOST_PORT`          | Porta HTTP local; por exemplo, `3100`, `3200`, `3300`.                            |
| Variable | `CORS_ORIGIN`            | Origem pública do frontend do ambiente.                                           |
| Variable | `DB_HOST`                | Host do PostgreSQL externo.                                                       |
| Variable | `DB_PORT`                | Porta do PostgreSQL; padrão `5432`.                                               |
| Variable | `DB_DATABASE`            | Banco exclusivo do ambiente.                                                      |
| Variable | `DB_USERNAME`            | Usuário do banco do ambiente.                                                     |
| Variable | `DB_SSL`                 | `true` ou `false`, conforme o provedor.                                           |
| Variable | `JWT_ACCESS_EXPIRES_IN`  | Duração do token; padrão `15m`.                                                   |
| Variable | `I18N_FALLBACK_LANGUAGE` | Idioma padrão; padrão `pt-BR`.                                                    |
| Secret   | `DB_PASSWORD`            | Senha do banco do ambiente.                                                       |
| Secret   | `JWT_SECRET`             | Segredo JWT exclusivo do ambiente.                                                |
| Secret   | `DEPLOY_SSH_KEY`         | Chave privada SSH exclusiva, sem passphrase.                                      |
| Secret   | `DEPLOY_KNOWN_HOSTS`     | Chave pública do host verificada; use `[host]:porta` se a porta SSH não for `22`. |

`PORT` e `NODE_ENV` não precisam ser cadastradas: o comando fixa `PORT=3000` e
`NODE_ENV=production` dentro dos três contêineres.

Para habilitar avatares e anexos, configure as variables `R2_ENABLED=true`,
`R2_ENDPOINT` (URL S3, sem o nome do bucket) e `R2_BUCKET_NAME`, além dos secrets
`R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` no mesmo Environment. Com `R2_ENABLED=true`,
o deploy falha se algum desses valores estiver vazio. Se a flag for omitida ou `false`,
o deploy não envia as credenciais ao contêiner. Consulte o
[guia de provisionamento do R2](../storage-e-operacao.md#2-configuração-do-cloudflare-r2-aca-25).

### Contrato com a VPS

- Host Linux `amd64` com Bash, Docker Engine, `curl`, `base64` (GNU coreutils) e `flock` (`util-linux`).
- O workflow envia `scripts/deploy-api.sh` do checkout da `main` a cada execução. Não há
  script de deploy para instalar na VPS. As configurações viajam separadamente pela entrada
  padrão do SSH, sem aparecer nos argumentos remotos. O script só
  aceita as chaves de runtime previstas e as repassa ao Docker sem gravar arquivos `.env`
  na VPS. O Docker guarda as variáveis na configuração dos contêineres; quem tem acesso
  administrativo ao Docker pode inspecioná-las, inclusive no contêiner de rollback.
- No `~/.ssh/authorized_keys` do usuário configurado em `DEPLOY_SSH_USER` (por padrão,
  `/home/admin/.ssh/authorized_keys`), cadastre a chave pública dedicada de cada ambiente:

  ```text
  restrict ssh-ed25519 <chave-publica>
  ```

  O workflow autentica com esse usuário e usa `sudo -n` para executar o script com privilégios
  de `root`. A conta precisa autorizar essa operação sem senha e sem exigir TTY. `restrict`
  desabilita TTY e encaminhamento, mas a chave ainda dá acesso aos privilégios da conta.
  Não é necessário habilitar login SSH direto como `root`.

- A API escuta no contêiner na porta `3000`, vinculada a `127.0.0.1:$API_HOST_PORT` na VPS.
  Se o PostgreSQL já provisionado estiver acessível no host Docker, `DB_HOST=host.docker.internal`
  adiciona o mapeamento `host-gateway` à migration e à API. Nenhum banco é criado pelo deploy.

## Publicar e implantar

1. Abra **Deploy Snapshot** em `main` e selecione `development` ou `staging`. Deixe
   `commit` vazio para usar o commit da execução ou informe o SHA completo de outro commit
   de `main` com CI verde. O workflow reutiliza uma imagem assinada para o mesmo SHA ou faz
   o build, executa o Trivy e assina a imagem e o SBOM SPDX. Não precisa de deploy prévio.
2. Execute **Create Release** em `main` com `X.Y.Z`, por exemplo `0.2.0`. O workflow exige
   CI verde para o commit de origem, versão crescente e notas em `[Unreleased]`. Atualiza
   `package.json`, move as notas para a seção datada no `CHANGELOG.md` e constrói e assina
   a imagem do commit de release. Depois, publica o commit em `main`, a tag `vX.Y.Z` e a
   GitHub Release com as notas. Não consulta deploys nem aciona um deploy. Para recuperar
   uma falha parcial, use **Re-run failed jobs** na mesma execução. Não mova uma tag publicada.
3. Para produção, execute **Deploy Release** em `main` e informe `X.Y.Z`. O workflow
   usa o digest assinado registrado na release, sem rebuild ou deploy anterior em staging.
   Antes de aprovar, confirme
   o banco de destino, um backup recente com caminho de restauração conhecido e a compatibilidade
   do esquema com a versão que ficará no ar durante a migration. O histórico de deployments
   guarda ambiente, versão, digest e resultado (task `acadflow-image`).

## Falhas e rollback

O comando remoto bloqueia deploys concorrentes no ambiente, baixa a imagem por digest e roda
`npm run migration:run:prod` em um contêiner temporário. Se a migration falhar, o contêiner
da API não é substituído. A troca pode causar uma breve indisponibilidade; o deploy só registra
sucesso depois de HTTP `200` em `/health`, que também verifica a conexão com o banco.

Uma falha de saúde não reverte o banco nem reinicia automaticamente a imagem anterior. Quando
existir, o contêiner anterior fica parado com o sufixo `-previous`. Se o operador confirmar
compatibilidade de esquema e precisar voltar **apenas** a aplicação, coordene a pausa dos deploys
do ambiente e, no host, pare/remova o contêiner atual, renomeie `-previous` para o nome ativo
(`acadflow-api-<ambiente>`), inicie-o e confira `/health`. Isso não altera dados nem o esquema;
registre o rollback operacionalmente. Para esquemas incompatíveis, prefira uma correção para
frente ou siga o procedimento externo de recuperação do banco.
