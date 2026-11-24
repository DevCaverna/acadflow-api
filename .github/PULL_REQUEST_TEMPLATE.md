# Pull Request — AcadFlow API

## 📌 Descrição

<!-- Descreva a mudança de backend e as regras de negócio alteradas. -->

---

## 🏷 Tipo de PR

- [ ] 🐛 Bugfix
- [ ] ✨ Feature
- [ ] ♻️ Refactor
- [ ] ⚡ Performance
- [ ] 🧪 Testes
- [ ] 📚 Documentação
- [ ] 🔧 Chore
- [ ] 🚨 Hotfix

---

## 🔗 Links Relacionados

- **Task no Linear:** ACA-...
- **Contrato REST/Swagger:** `docs/contratos-api.md`
- **Referência do design:** https://github.com/DevCaverna/acadflow-design

---

## 🧠 Contexto

<!-- Qual problema resolve? Quais entidades, rotas e perfis são afetados? -->

---

## 📋 Checklist

### Código e regras de negócio

- [ ] Organização por módulos de domínio em `src/modules/`; nomes em inglês e imports por alias `@/`
- [ ] Controllers delegam regras a services; DTOs validam entradas; erros seguem códigos estáveis
- [ ] Nenhum `console.log` ou código comentado desnecessário
- [ ] Mensagens são traduzidas por `nestjs-i18n` em `pt-BR`, quando aplicável
- [ ] O backend valida propriedade/matrícula e papéis `PROFESSOR` / `ALUNO`
- [ ] Médias seguem o design: >= 7 aprovado; 5 a < 7 recuperação; < 5 reprovado; sem avaliações = `NO_GRADES`
- [ ] Dados sensíveis e senhas não vazam nas respostas; bcrypt é usado para armazenamento de senha
- [ ] Migrations TypeORM manuais têm `up()` e `down()`; `synchronize: false`
- [ ] Contratos REST e Swagger atualizados quando as rotas ou DTOs mudaram

### Qualidade

- [ ] `pnpm lint`
- [ ] `pnpm format` (ou `pnpm format:check` no CI)
- [ ] `pnpm typecheck`
- [ ] `pnpm test` (Vitest)
- [ ] Testes significativos e casos de erro/limite
- [ ] `pnpm build` + verificação de imports `@/` resolvidos no JS de `dist/`
- [ ] `CHANGELOG.md` em `[Unreleased]` atualizado quando aplicável
- [ ] README/docs/.env.example atualizados se necessário

### Segurança e banco

- [ ] JWT, papéis e autorização por recurso testados
- [ ] Nenhuma credencial, URL assinada ou segredo commitado
- [ ] Migration aplicada/revertida em ambiente de teste, quando houver mudança de esquema
- [ ] Arquivos de usuário validados (MIME/conteúdo/tamanho) quando houver upload

### Variáveis de ambiente

- [ ] Novas `DB_*`, `JWT_*`, `R2_*` etc. documentadas em `.env.example`
- [ ] O código nunca depende de segredos fixos

---

## 🧪 Evidências

<!-- Inclua logs de Vitest, screenshot de Actions, chamadas de API, migrations ou testes e2e. -->

---

## 🚀 Observações adicionais

<!-- Compatibilidade de contratos, migrations destrutivas, plano de rollback e follow-ups. -->
