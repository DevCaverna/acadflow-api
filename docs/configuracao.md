# Configuração local (preparação)

1. Instalar Node.js LTS e pnpm.
2. Copiar `.env.example` para `.env` e ajustar `DB_*`, `CORS_ORIGIN` e `JWT_SECRET`.
3. Iniciar PostgreSQL local com banco e usuário informados; não usar credenciais de produção no desenvolvimento.
4. Após criação do `package.json` NestJS, instalar dependências com `pnpm install` e executar os scripts do projeto.

**Atenção:** este repositório ainda está no estágio de scaffolding. Os scripts NestJS/migrations dependem do bootstrap e da configuração TypeORM que serão concluídos na issue correspondente.
