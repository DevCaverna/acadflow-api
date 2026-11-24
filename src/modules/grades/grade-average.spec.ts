import { describe, expect, it } from 'vitest';
import { calculateGradeAverage } from '@/modules/grades/grade-average';

describe('calculateGradeAverage', () => {
  it('returns SEM_NOTAS instead of zero when there are no grades', () => {
    expect(calculateGradeAverage([])).toEqual({ average: null, status: 'SEM_NOTAS' });
  });

  it('averages 8 and 6 as 7 and approves', () => {
    expect(calculateGradeAverage([8, 6])).toEqual({ average: 7, status: 'APROVADO' });
  });

  it.each([
    [0, 'REPROVADO'],
    [4.9, 'REPROVADO'],
    [5, 'RECUPERACAO'],
    [6, 'RECUPERACAO'],
    [6.9, 'RECUPERACAO'],
    [7, 'APROVADO'],
    [10, 'APROVADO'],
  ] as const)('classifies average %s as %s', (value, status) => {
    expect(calculateGradeAverage([value])).toEqual({ average: value, status });
  });

  it('classifies by the average rounded once to one decimal place', () => {
    expect(calculateGradeAverage([6.9, 7])).toEqual({ average: 7, status: 'APROVADO' });
    expect(calculateGradeAverage([4.9, 4.9, 5])).toEqual({ average: 4.9, status: 'REPROVADO' });
  });
});
