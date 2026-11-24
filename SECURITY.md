# Política de Segurança — AcadFlow API

## Versões Suportadas

As correções de segurança são integradas em `main` e promovidas por ambiente. Em produção, use a release estável mais recente.

## Como Reportar uma Vulnerabilidade

**Não abra uma issue pública no GitHub** para falhas de segurança (ex.: bypass de autenticação/RBAC, vazamento de dados de alunos/notas, exposição de credenciais ou vulnerabilidades em upload/storage).

1. Utilize o recurso **Private Vulnerability Reporting** (Security Advisories) do repositório `DevCaverna/acadflow-api` no GitHub, caso habilitado, ou envie relato diretamente aos mantenedores da equipe **DevCaverna** pelo canal privado do projeto.
2. Inclua na mensagem:
   - Descrição clara do impacto e dos perfis envolvidos (`PROFESSOR`, `ALUNO` ou não autenticado).
   - Passos mínimos ou requisição HTTP para reprodução (sem dados reais ou sensíveis).
   - Commit ou versão afetada.

## Compromisso de Resposta

- Confirmação inicial de recebimento em até **48 horas úteis**.
- Avaliação de severidade, correção em branch privada/isolada e publicação de atualização conforme criticidade.
- Consulte [docs/seguranca.md](docs/seguranca.md) para detalhes sobre controles já implementados.
