# AcadFlow API — arquitetura inicial

**Stack:** NestJS / TypeScript / pnpm / PostgreSQL / TypeORM / JWT + bcrypt / Vitest / nestjs-i18n.  
**Repos:** [Web](https://github.com/DevCaverna/acadflow-web) · [Design](https://github.com/DevCaverna/acadflow-design).  
**Linear:** https://linear.app/acadflow/document/acadflow-arquitetura-apiweb-i18n-tanstack-query-e-migrations-15ff46ed6d06

```text
src/
  config/
  common/{decorators,guards,filters,interceptors}/
  database/{data-source.ts,migrations/,seeds/}
  i18n/{pt-BR,en}/
  modules/{auth,users,disciplines,enrollments,activities,grades,storage}/
test/
scripts/migration-create.mjs
```

## Decisões

- Um módulo por domínio. Validações em DTOs, regras em services, autorização no backend.
- Dados de notas: 0 a 10; média >=7 aprovado, 5 a <7 recuperação, <5 reprovado; sem notas = SEM_NOTAS.
- Não usar `synchronize: true`; evolução de esquema por migrations manuais.
- `pt-BR` é o idioma padrão; erros estruturados têm `code` estável.
- Foto de perfil via R2/Sharp é melhoria posterior ao MVP; chave privada fica no backend.
- O diretório inicial criado neste PR é **esqueleto de pastas/configuração**, não a implementação completa de módulos.

## Trabalho paralelo

Maurício: infraestrutura, auth, banco/migrations. Vinicius: regras de domínio e testes em módulos separados. Otávio: Web consumindo os contratos em [contratos-api.md](contratos-api.md) com mocks até a API estar disponível.
