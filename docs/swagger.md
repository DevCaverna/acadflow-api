# Documentação Interativa — Swagger / OpenAPI

A **AcadFlow API** expõe documentação OpenAPI interativa gerada automaticamente pelo `@nestjs/swagger` a partir dos controllers e DTOs da aplicação.

## Endpoints da Documentação

Com a API em execução (por padrão em `http://localhost:3000`):

| Recurso          | URL                               | Finalidade                                                                        |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------------- |
| **Swagger UI**   | `http://localhost:3000/docs`      | Interface web interativa para explorar e testar rotas                             |
| **OpenAPI JSON** | `http://localhost:3000/docs-json` | Especificação OpenAPI em JSON para importação em clientes HTTP ou geração de SDKs |

> A configuração está centralizada em `src/main.ts` (`DocumentBuilder` + `SwaggerModule.setup('docs', ...)`), com `persistAuthorization: true` habilitado para manter o token JWT durante a sessão no navegador.

## Como Testar Rotas Autenticadas no Swagger

1. Abra `http://localhost:3000/docs`.
2. Expanda `POST /auth/login` (tag **auth**), clique em **Try it out** e envie um usuário de desenvolvimento criado pelo `pnpm seed`:
   - Professor: `professor@acadflow.local`
   - Aluno: `aluno@acadflow.local` ou `aluna@acadflow.local`
3. Copie o valor de `accessToken` da resposta `200`.
4. Clique no botão **Authorize** no topo da página, cole apenas o token JWT (sem o prefixo `Bearer`) e confirme.
5. Teste qualquer rota protegida (ex.: `GET /auth/me`, `GET /disciplines`).

## Testando Internacionalização (`Accept-Language`)

- Por padrão, mensagens de erro e validação retornam em `pt-BR`.
- Para testar respostas em inglês pelo Swagger ou por clientes HTTP, envie o header `Accept-Language: en` na requisição.
- O campo `code` (ex.: `VALIDATION_ERROR`, `FORBIDDEN`, `CONFLICT`) e enums (`PROFESSOR`, `ALUNO`, `APPROVED`, `RECOVERY`, `FAILED`, `NO_GRADES`) permanecem sempre em inglês.

## Padrões de Anotação no Código

Seguindo `AGENTS.md`:

- Todo controller declara `@ApiTags('<modulo>')`.
- Toda rota declara `@ApiOperation({ summary })` e suas respostas tipadas:
  - `@ApiResponse({ status, type })` (ou `@ApiOkResponse` / `@ApiServiceUnavailableResponse` em `/health`)
  - `@ApiListingResponse(ItemDto)` para respostas paginadas no formato `Listing<T>`
  - `@ApiErrors(...)` para mapear os códigos de erro possíveis com `ApiErrorDto`
- Todo DTO de entrada e saída anota seus campos com `@ApiProperty` ou `@ApiPropertyOptional`.
- O decorador `@Auth(...roles)` já inclui `@ApiBearerAuth()` automaticamente.

## Verificação Automatizada do Swagger

O teste E2E `test/e2e/disciplines.e2e-spec.ts` gera o documento OpenAPI em memória via `SwaggerModule.createDocument` e valida que o contrato gerado documenta tanto os DTOs de sucesso (`DisciplineResponseDto`) quanto o contrato padrão de erro (`ApiErrorDto`).
