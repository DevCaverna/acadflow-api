import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_attachments')
export class ActivityAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'activity_id', type: 'uuid' })
  activityId!: string;

  @Column({ name: 'object_key', type: 'varchar', length: 255 })
  objectKey!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt!: Date;
}
