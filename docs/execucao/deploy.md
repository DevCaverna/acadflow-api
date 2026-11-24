# Releases e deploy da API

O GitHub Actions publica uma imagem Linux `amd64` no GHCR e promove **o mesmo digest** entre
`development`, `staging` e `production`. Na VPS, a API usa Docker Engine diretamente, sem Compose
e sem checkout. O PostgreSQL, os backups, o proxy, o HTTPS e o provisionamento dos hosts são
externos ao projeto.

## Primeira configuração

Os workflows de entrega precisam existir na branch padrão (`main`). A entrega é acionada
manualmente; um push ou uma execução da CI não publica nem implanta imagens por si só.

1. Proteja `develop`, `staging` e `main` com revisão e CI obrigatórios. Configure regras para
   impedir alteração/exclusão de tags `v*`, preservando a criação pelo workflow. Restrinja alterações
   nos workflows de entrega a PRs revisados.
2. Em **Settings → Environments** no GitHub, crie `development`, `staging` e `production`.
   Permita deploy apenas a partir de `main` (é a ref do workflow, não a ref da imagem). Em
   `production`, configure revisores obrigatórios, impeça autoaprovação e desabilite bypass
   administrativo. O workflow recusa produção sem revisores ou se o solicitante puder
   autoaprovar. Não disponibilize chaves SSH no nível do repositório.
3. Em cada Environment, configure as variables e secrets da tabela abaixo. Na mesma VPS,
   `DEPLOY_HOST`, `DEPLOY_PORT` e `DEPLOY_KNOWN_HOSTS` podem ser iguais; use uma chave SSH,
   uma porta HTTP local e um banco distintos por ambiente.
4. O GHCR precisa permitir publicação por este repositório. Caso o pacote seja privado,
   configure o login Docker de `root` na VPS com credencial **somente de leitura** do pacote.
   Não remova do GHCR a imagem, a assinatura nem a atestação de versões que ainda podem ser
   implantadas.

| Tipo     | Nome                     | Valor                                                                             |
| -------- | ------------------------ | --------------------------------------------------------------------------------- |
| Variable | `DEPLOY_HOST`            | DNS ou IPv4 da VPS.                                                               |
| Variable | `DEPLOY_PORT`            | Porta SSH; padrão `22`.                                                           |
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

### Contrato com a VPS

- Host Linux `amd64` com Bash, Docker Engine, `curl` e `flock` (`util-linux`).
- Instale `scripts/deploy-api.sh` como `/usr/local/bin/acadflow-deploy`, executável e gravável
  somente por `root`. Atualize o comando no host manualmente quando houver mudanças nele; o
  workflow não envia scripts ao servidor.
- O workflow envia as configurações do ambiente pela entrada padrão do SSH. O comando só
  aceita as chaves de runtime previstas e as repassa ao Docker sem gravar arquivos `.env`
  na VPS. O Docker guarda as variáveis na configuração dos contêineres; quem tem acesso
  administrativo ao Docker pode inspecioná-las, inclusive no contêiner de rollback.
- Em `root` → `authorized_keys`, associe a chave de cada ambiente a um comando fixo:

  ```text
  restrict,command="/usr/local/bin/acadflow-deploy production" ssh-ed25519 <chave-publica>
  ```

  O único argumento fixo é o ambiente. A API escuta no contêiner na porta `3000`, vinculada
  a `127.0.0.1:$API_HOST_PORT` na VPS para o seu proxy. Restrinja o login SSH de `root`
  ao modo `forced-commands-only` se a política do host permitir; nunca libere shell geral para
  a chave da pipeline.

## Publicar e promover

1. Abra **Deploy Snapshot** e execute o workflow a partir de `main`. Selecione
   `environment=development` e `branch=develop`. O campo `commit` pode ficar vazio para
   usar o HEAD da branch escolhida quando o job resolver a origem. Se preenchido, use o SHA
   Git completo de um commit dessa branch. O commit precisa de CI verde de push na branch.
   O workflow reutiliza a imagem já implantada com sucesso em `development` para o mesmo conteúdo.
   Sem uma imagem reutilizável, faz o build pelo `docker/Dockerfile`, publica no GHCR, bloqueia
   vulnerabilidades críticas com Trivy e assina a imagem e o SBOM SPDX com Cosign/OIDC.
2. Depois do PR `develop → staging` e da CI verde, execute **Deploy Snapshot** novamente
   com `environment=staging` e `branch=staging`. O workflow procura um deploy bem-sucedido em
   `development` com a mesma árvore Git e reutiliza seu digest. Um SHA de merge diferente é
   permitido; sem conteúdo correspondente, não há deploy nem rebuild.
3. Depois do PR `staging → main` e da CI verde, execute **Create Release** a partir de `main`.
   Informe `vX.Y.Z`; o workflow usa o HEAD da `main` no momento do acionamento e seleciona
   o deploy bem-sucedido mais recente em `staging` com a mesma árvore Git. Para escolher outra
   imagem homologada, informe `candidate` no formato `COMMIT@sha256:DIGEST`. O workflow
   publica a tag e a GitHub Release com o digest verificado. Se falhar após criar tag ou draft,
   reexecute os jobs que falharam para manter a mesma versão, candidata e commit.
   Não retague nem sobrescreva uma versão publicada.
4. Para produção, execute **Deploy Release** em `main` e informe a versão
   `vX.Y.Z`. Confira o digest no resumo do job de verificação. Antes de aprovar, confirme
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
