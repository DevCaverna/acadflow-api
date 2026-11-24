export type GradeStatus = 'SEM_NOTAS' | 'APROVADO' | 'RECUPERACAO' | 'REPROVADO';

export type GradeAverage = { readonly average: number | null; readonly status: GradeStatus };

const APPROVED_AVERAGE = 7;
const RECOVERY_AVERAGE = 5;

export function calculateGradeAverage(values: readonly number[]): GradeAverage {
  if (values.length === 0) return { average: null, status: 'SEM_NOTAS' };
  const tenths = values.reduce((sum, value) => sum + Math.round(value * 10), 0);
  const average = Math.round(tenths / values.length) / 10;
  if (average >= APPROVED_AVERAGE) return { average, status: 'APROVADO' };
  return { average, status: average >= RECOVERY_AVERAGE ? 'RECUPERACAO' : 'REPROVADO' };
}
