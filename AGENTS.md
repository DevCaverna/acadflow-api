# AGENTS.md — AcadFlow API

> Diretrizes para agentes de IA e colaboradores que implementam tarefas neste repositório.

## 1. Contexto e fonte de verdade

- **Projeto:** AcadFlow, sistema acadêmico com perfis `PROFESSOR` e `ALUNO`.
- **Repositório:** `DevCaverna/acadflow-api`; frontend separado em `DevCaverna/acadflow-web`.
- **Referências obrigatórias:** [projeto no Linear](https://linear.app/acadflow/project/acadflow-sistema-de-gestao-academica-11ce95e87805), `docs/arquitetura.md`, `docs/contratos-api.md`, `docs/execucao/README.md` e [acadflow-design](https://github.com/DevCaverna/acadflow-design).
- **Stack-alvo:** Node.js 24, pnpm 12.4.2, NestJS, TypeScript 6 (strict), PostgreSQL 17, TypeORM, JWT/bcrypt, Swagger, `nestjs-i18n`, Vitest e Supertest.
- **Idiomas do produto:** `pt-BR` (padrão) e `en`. Nomes de código, classes, arquivos, variáveis, chaves i18n e mensagens de commit em inglês; explicações/documentação podem ser em português.
- **Regra de precedência:** requisito da issue e contrato aprovado > documentação técnica atual > sugestões neste arquivo. Ao encontrar conflito, registrar o conflito antes de alterar contratos ou regras.

## 2. Organização de pastas

```text
src/
  main.ts
  app.module.ts
  config/
  common/{decorators,guards,filters,interceptors,types}/
  database/{data-source.ts,migrations/,seeds/}
  i18n/{pt-BR,en}/
  modules/
    auth/{dto,guards,strategies}/
    users/{dto,entities}/
    disciplines/{dto,entities}/
    enrollments/{dto,entities}/
    activities/{dto,entities}/
    grades/{dto,entities}/
    health/{dto}/
    storage/
test/
  integration/
  e2e/
  support/{factories,fixtures,mocks,setup}/
docker/
  Dockerfile
  Dockerfile.dev
  Dockerfile.test
  compose.dev.yml
  compose.test.yml
docs/execucao/
scripts/
```

- Separar funcionalidades por **módulo de domínio** com controller, service, DTOs, entidades e testes quando necessários.
- Controller recebe/valida requisição; service implementa regra; entidades persistem dados; guard valida autorização.
- Não introduzir repository abstrato, fila, Redis ou microserviços sem uma necessidade aprovada.
- Um repositório Git não depende de arquivos internos do outro; integração somente por contrato HTTP documentado.

## 3. Imports, TypeScript e estilo

- Para módulos internos usar imports `@/`, apontando para `src/`, em vez de longos caminhos `../../`.
- Configurar o alias em `tsconfig.json`, Vitest e **no runtime/build**. `paths` do TypeScript sozinho não reescreve os imports emitidos; validar `tsc-alias` no build e resolução do modo de desenvolvimento.
- Usar TypeScript `strict`, DTOs tipados, `readonly` quando apropriado e `unknown` em lugar de `any` indiscriminado.
- NestJS com decorators precisa de `experimentalDecorators` e `emitDecoratorMetadata`; não impor `erasableSyntaxOnly` à API.
- Seguir Oxlint e Oxfmt; não misturar com ESLint/Prettier.
- Padrões: `users.service.ts`, `create-user.dto.ts`, `user.entity.ts`, `users.controller.ts`, `users.service.spec.ts`.
- Comentários somente quando explicam decisões não evidentes; sem `console.log` de depuração ou código comentado. Usar logger do Nest quando necessário.

### Padrões de implementação

- **Tipagem:** métodos de service com mais de um dado recebem um objeto tipado e declaram o retorno. Linhas cruas usam tipo próprio em `<modulo>.types.ts` (`getRawOne<ActivityAccessRow>()`).
- **QueryBuilder:** usar em consultas com joins ou filtros, com parâmetros nomeados e blocos em métodos privados (`applyFilter`, `applyVisibility`). Nunca concatenar entrada do usuário no SQL.
- **Paginação:** `PaginationOptionsDto<FilterDto>` com `ValidatePaginationPipe(FilterDto, SORT_FIELDS)` e retorno `Listing<ResponseDto>`. Ordenar só por campos permitidos, com desempate por `id`.
- **DTOs:** `@ApiProperty`/`@ApiPropertyOptional` em todo campo e validação com `i18nValidationMessage('validation.*')`. A resposta usa DTO próprio, nunca a entidade.
- **Swagger:** toda rota tem `@ApiOperation({ summary })` e respostas tipadas (`@ApiResponse`, `@ApiListingResponse`, `@ApiErrors`).
- **Acesso:** `@Auth()` exige login; `@Auth('PROFESSOR')` exige o papel. Usuário autenticado por `@CurrentUser()`.

```ts
@Get()
@Auth()
@ApiOperation({ summary: 'Listar disciplinas' })
@ApiListingResponse(DisciplineResponseDto)
@ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.UNAUTHORIZED)
findAll(
  @CurrentUser() user: User,
  @Query(new ValidatePaginationPipe(DisciplineFilterDto, DISCIPLINE_SORT_FIELDS))
  paginationOptionsDto: PaginationOptionsDto<DisciplineFilterDto>,
): Promise<Listing<DisciplineResponseDto>> {
  return this.disciplinesService.findAll({ user, paginationOptionsDto });
}
```

## 4. Regras de negócio e segurança

- Os únicos papéis são `PROFESSOR` e `ALUNO`. No MVP, contas e matrículas são criadas por seed. O cadastro público é pós-MVP e só poderá criar `ALUNO`; professor, só por seed ou processo autorizado.
- Um professor só gerencia suas disciplinas; um aluno só consulta disciplinas em que está matriculado e suas próprias notas.
- Matrícula é única por `(studentId, disciplineId)` e nota é única por `(studentId, activityId)`; usar constraints no PostgreSQL e validações no serviço.
- Nota no intervalo **0 a 10**; média aritmética das notas efetivamente lançadas, arredondada uma única vez para uma casa decimal antes de classificar. Sem notas: `NO_GRADES` e média `null`.
- Média `>= 7`: `APPROVED`; `>= 5` e `< 7`: `RECOVERY`; `< 5`: `FAILED`. **O design existente define os limites**, não assumir aprovação a partir de 6.
- Não confiar no papel ou identificador enviado pelo cliente para decidir autorização. Verificar JWT, ownership e matrícula no backend.
- Senhas somente como hash bcrypt; nunca retorná-las. Erro de login genérico e mensagens de erro estruturadas com `code` estável.
- O modelo do MVP tem cinco tabelas: `users`, `disciplines`, `enrollments`, `activities` e `grades`. Perfil completo, R2/Sharp, anexos, matrículas manuais e notificações são pós-MVP.

## 5. Internacionalização

- Usar `nestjs-i18n` com `Accept-Language`, fallback `pt-BR` e recursos em `src/i18n/pt-BR` e `src/i18n/en`.
- Mensagens e validações apresentadas ao usuário devem possuir traduções em **ambos** os idiomas.
- Não traduzir nomes de enums, códigos de erro, claims JWT nem valores persistidos. HTTP continua com `statusCode` e `code` estáveis.
- Configurar cópia dos arquivos i18n para `dist` e testar fallback no processo compilado.
- O checklist do template de PR cobra `pt-BR`; toda tradução nova da aplicação deve ser adicionada **também em `en`**.

## 6. PostgreSQL, TypeORM e migrations

- IDs são UUID v7, gerados no banco por `public.uuid_generate_v7()` (o PostgreSQL 17 não tem `uuidv7()` nativo). Nova tabela com `id` usa esse default; entidade usa `@PrimaryGeneratedColumn('uuid')`.
- PostgreSQL 17 e TypeORM com `synchronize: false` e `migrationsRun: false`.
- Criar migrations **manuais** pelo script `pnpm migration:create NomeDaMigracao`, com timestamp gerado pelo TypeORM. Implementar e revisar `up()` e `down()`.
- Usar scripts `pnpm migration:show`, `pnpm migration:run` e `pnpm migration:revert`; verificar `DB_HOST` e `DB_DATABASE` antes de `run` ou `revert`.
- Não utilizar `migration:generate` como padrão do MVP.
- Nunca executar migration produtiva automaticamente no startup de cada réplica; usar etapa de release única e protegida quando existir deploy.
- Não criar fixtures/mocks com dados reais ou dados sensíveis.

## 7. Testes e Docker

- **Unitários:** `*.spec.ts` ao lado do código, Vitest, mocks, sem Docker.
- **Integração:** `test/integration/**/*.int-spec.ts`, PostgreSQL temporário via Docker, migrations reais.
- **E2E:** `test/e2e/**/*.e2e-spec.ts`, Supertest, PostgreSQL temporário.
- O runner de testes cria um banco por worker (`acadflow_test_1` ... `_4`) e remove o projeto Compose/volumes ao final.
- Nunca executar testes de integração/E2E no banco de desenvolvimento ou produção.
- Adicionar casos de sucesso, falha, autorização e limites de nota; manter testes independentes e limpar dados entre cenários.
- Arquivos Docker previstos: `docker/Dockerfile`, `docker/Dockerfile.dev`, `docker/Dockerfile.test`, `docker/compose.dev.yml`, `docker/compose.test.yml`.
- Documentar instalação e execução em `docs/execucao/README.md`, não apenas no README da raiz.

## 8. Comandos e qualidade

```bash
pnpm install
pnpm start:dev
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:check
pnpm typecheck
pnpm test:unit
pnpm test:docker 2
pnpm test:cov
pnpm build
pnpm pr
```

- GitHub Actions deve validar `develop`, `staging` e `main` com Node 24 e pnpm 12.4.2: lint, format:check, typecheck, testes, build e artefatos **somente após validação verde**.
- Pipeline não é sinônimo de deploy. Não declarar CI aprovada sem workflow executado com sucesso.

## 9. Issues, branches, commits e PRs

- Trabalhar exclusivamente dentro do escopo da issue `ACA-*`; descrever o planejamento antes de alterar arquitetura ou contrato.
- Criar branch `feature/ACA-<numero>-descricao-curta` partindo de `develop`.
- Promoção: `develop` → `staging` → `main`, sempre via PR e revisão humana.
- Conventional Commits em inglês, com mensagem curta no formato `<prefixo>: <descrição>`:

  | Prefixo     | Quando usar                |
  | ----------- | -------------------------- |
  | `feat:`     | Nova funcionalidade        |
  | `fix:`      | Correção de bug            |
  | `refactor:` | Refatoração                |
  | `test:`     | Adição ou ajuste de testes |
  | `docs:`     | Documentação               |
  | `chore:`    | Manutenção e configurações |
  | `ci:`       | Pipelines e GitHub Actions |

- Preencher `.github/PULL_REQUEST_TEMPLATE.md`, linkar Linear, listar mudanças de contrato/migration, testes e evidências.
- Antes de adicionar endpoint/campo, consultar `docs/contratos-api.md` e avisar o time Web para atualizar mocks; assim os três desenvolvedores continuam em paralelo.
- Não editar arquivos de outros repositórios nem tentar merge sem autorização explícita.

## 10. Segredos, documentação e espaço de agentes

- Manter `.env.example` com nomes/valores ilustrativos; `.env` e `.env.test` sempre ignorados no Git.
- Não colocar tokens, credenciais R2, dados reais de usuários, chave JWT ou strings secretas em commits, logs e respostas.
- Configurar `.vscode/` e `.zed/` compartilhados para Oxlint/Oxfmt; não versionar preferências individuais.
- Se a equipe adotar `.agents/`, reservar `.agents/memory/` para decisões duráveis, `.agents/prompts/` para prompts revisados e `.agents/artifacts/` para saídas descartáveis não versionadas. Nunca colocar secrets nesse espaço.
- Ao concluir, informar exatamente quais arquivos foram alterados e quais comandos realmente rodaram. Se algo não foi testado, declarar explicitamente.
