# Configuração local (preparação)

1. Instalar Node.js 24 e pnpm.
2. Copiar `.env.example` para `.env` e ajustar `DB_*`, `CORS_ORIGIN` e `JWT_SECRET`.
3. Iniciar PostgreSQL local com banco e usuário informados; não usar credenciais de produção no desenvolvimento.
4. Executar `pnpm install`, `pnpm migration:run` e `pnpm start:dev`.
