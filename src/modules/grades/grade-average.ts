export type GradeStatus = 'NO_GRADES' | 'APPROVED' | 'RECOVERY' | 'FAILED';

export type GradeAverage = { readonly average: number | null; readonly status: GradeStatus };

const APPROVED_AVERAGE = 7;
const RECOVERY_AVERAGE = 5;

export function calculateGradeAverage(values: readonly number[]): GradeAverage {
  if (values.length === 0) return { average: null, status: 'NO_GRADES' };
  const tenths = values.reduce((sum, value) => sum + Math.round(value * 10), 0);
  const average = Math.round(tenths / values.length) / 10;
  if (average >= APPROVED_AVERAGE) return { average, status: 'APPROVED' };
  return { average, status: average >= RECOVERY_AVERAGE ? 'RECOVERY' : 'FAILED' };
}
