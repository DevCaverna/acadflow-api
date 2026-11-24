# ADR-0001: Uso de UUID v7 via função SQL no PostgreSQL 17

- **Status:** Aceita
- **Data:** 2026-11-23
- **Arquivos relacionados:** `src/database/migrations/1795522438629-UseUuidV7.ts`, `test/integration/uuid-v7.int-spec.ts`

## Contexto

As tabelas principais do AcadFlow (`users`, `disciplines`, `activities`, `grades`) precisam de identificadores primários únicos, seguros contra enumeração sequencial na URL e eficientes para indexação em B-Tree.

O PostgreSQL 17 não possui a função nativa `uuidv7()` (disponível somente a partir do PostgreSQL 18), oferecendo nativamente apenas `gen_random_uuid()` (UUID v4).

## Decisão

Implementar a função SQL `public.uuid_generate_v7()` via migration manual (`1795522438629-UseUuidV7.ts`) usando `clock_timestamp()` para os 48 bits iniciais e bytes aleatórios de `gen_random_uuid()`, definindo-a como `DEFAULT` da coluna `id` nas tabelas aplicáveis. As entidades TypeORM usam `@PrimaryGeneratedColumn('uuid')`, deixando a geração de IDs a cargo do banco.

## Alternativas Consideradas

- **UUID v4 (`gen_random_uuid()`):** simples, porém totalmente aleatório, causando fragmentação de índices B-Tree sob carga e perdendo ordenação cronológica natural no desempate por `id`.
- **Gerar UUID v7 na aplicação (Node.js):** exigiria lembrar de popular o `id` em todo insert/seed/SQL direto e dificultaria consistência em operações em lote no banco.
- **Bigint/Serial sequencial:** expõe volume de registros e facilita enumeração de recursos nas rotas REST.

## Consequências

- **Positivas:** IDs ordenáveis temporalmente, excelente localidade de índice, independência de código na camada de aplicação e compatibilidade nativa com PostgreSQL 17.
- **Negativas:** a migration cria uma função customizada no schema `public` (com `SET search_path = pg_catalog`), que precisará ser mantida até eventual migração para PostgreSQL 18+.
