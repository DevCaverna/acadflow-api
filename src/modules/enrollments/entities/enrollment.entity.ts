import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('enrollments')
export class Enrollment {
  @PrimaryColumn({ name: 'student_id', type: 'uuid' })
  studentId!: string;

  @PrimaryColumn({ name: 'discipline_id', type: 'uuid' })
  disciplineId!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
