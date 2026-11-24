import { describe, expect, it } from 'vitest';
import { calculateGradeAverage } from '@/modules/grades/grade-average';

describe('calculateGradeAverage', () => {
  it('returns NO_GRADES instead of zero when there are no grades', () => {
    expect(calculateGradeAverage([])).toEqual({ average: null, status: 'NO_GRADES' });
  });

  it('averages 8 and 6 as 7 and approves', () => {
    expect(calculateGradeAverage([8, 6])).toEqual({ average: 7, status: 'APPROVED' });
  });

  it.each([
    [0, 'FAILED'],
    [4.9, 'FAILED'],
    [5, 'RECOVERY'],
    [6, 'RECOVERY'],
    [6.9, 'RECOVERY'],
    [7, 'APPROVED'],
    [10, 'APPROVED'],
  ] as const)('classifies average %s as %s', (value, status) => {
    expect(calculateGradeAverage([value])).toEqual({ average: value, status });
  });

  it('classifies by the average rounded once to one decimal place', () => {
    expect(calculateGradeAverage([6.9, 7])).toEqual({ average: 7, status: 'APPROVED' });
    expect(calculateGradeAverage([4.9, 4.9, 5])).toEqual({ average: 4.9, status: 'FAILED' });
  });
});
