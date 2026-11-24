import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { Discipline } from '@/modules/disciplines/entities/discipline.entity';

@Entity('activities')
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'discipline_id', type: 'uuid' })
  disciplineId!: string;

  @ManyToOne(() => Discipline)
  @JoinColumn({ name: 'discipline_id' })
  discipline!: Relation<Discipline>;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
