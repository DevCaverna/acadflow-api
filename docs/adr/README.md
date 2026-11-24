# Architecture Decision Records (ADRs) — AcadFlow API

Este diretório registra as decisões arquiteturais relevantes tomadas na construção da **AcadFlow API**, preservando o contexto, as alternativas avaliadas e as consequências de cada escolha.

| ADR                                                     | Título                                                          | Status                      | Data       |
| ------------------------------------------------------- | --------------------------------------------------------------- | --------------------------- | ---------- |
| [0001](0001-uuid-v7-no-postgresql-17.md)                | Uso de UUID v7 via função SQL no PostgreSQL 17                  | Aceita                      | 2026-11-23 |
| [0002](0002-integridade-referencial-restrict.md)        | Integridade referencial estrita (`ON DELETE RESTRICT`)          | Aceita                      | 2026-11-23 |
| [0003](0003-calculo-e-arredondamento-de-medias.md)      | Cálculo de média em décimos inteiros com arredondamento único   | Aceita                      | 2026-11-24 |
| [0004](0004-oxc-typescript-6-e-pnpm.md)                 | Adoção de Oxlint, Oxfmt, TypeScript 6 e pnpm 12                 | Aceita                      | 2026-11-23 |
| [0005](0005-storage-privado-r2-e-urls-pre-assinadas.md) | Storage privado no Cloudflare R2 com URLs pré-assinadas e Sharp | Aceita (Pós-MVP / `ACA-25`) | 2026-11-24 |
