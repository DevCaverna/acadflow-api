# ADR-0003: Cálculo de média em décimos inteiros com arredondamento único

- **Status:** Aceita
- **Data:** 2026-11-24
- **Arquivos relacionados:** `src/modules/grades/grade-average.ts`, `src/modules/grades/grade-average.spec.ts`

## Contexto

Em JavaScript, operações de ponto flutuante IEEE 754 podem produzir imprecisões clássicas (por exemplo, `0.1 + 0.2 !== 0.3` ou `(6.9 + 7.0) / 2`), afetando classificações limítrofes como `5,0` (Recuperação) e `7,0` (Aprovado). Além disso, arredondamentos intermediários podem divergir do valor exibido ao aluno.

## Decisão

Centralizar o cálculo na função pura `calculateGradeAverage(values)`:

1. Sem notas lançadas (`values.length === 0`), retorna `{ average: null, status: 'NO_GRADES' }`; ausência de nota nunca é convertida para `0`.
2. Cada nota (`0.0` a `10.0`, máximo 1 casa decimal) é convertida para **décimos inteiros** (`Math.round(value * 10)`).
3. A soma inteira é dividida pela quantidade de notas efetivamente lançadas e arredondada **uma única vez** para 1 casa decimal (`Math.round(tenths / values.length) / 10`).
4. A classificação (`APPROVED` >= 7.0, `RECOVERY` >= 5.0 e < 7.0, `FAILED` < 5.0) é aplicada sobre a média **já arredondada**.

## Alternativas Consideradas

- **Soma direta em `number` sem escala inteira:** suscetível a erros binários de representação decimal em casos limítrofes.
- **Classificar antes de arredondar:** geraria inconsistência visual grave (ex.: média exibida `7,0` com status `Recuperação`).
- **Calcular via `AVG()` direto no SQL:** espalharia regra de classificação e arredondamento entre PostgreSQL e aplicação.

## Consequências

- **Positivas:** resultado determinístico, idêntico ao apresentado na UI e facilmente testável em unidade (`grade-average.spec.ts`) sem dependências externas.
- **Negativas:** caso médias ponderadas por peso de atividade sejam introduzidas no futuro, a assinatura de `calculateGradeAverage` precisará ser estendida mantendo a aritmética inteira.

