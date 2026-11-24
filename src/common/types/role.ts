export const ROLES = ['PROFESSOR', 'ALUNO'] as const;

export type Role = (typeof ROLES)[number];
