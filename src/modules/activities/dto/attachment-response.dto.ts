import { ApiProperty } from '@nestjs/swagger';
import type { ActivityAttachment } from '@/modules/activities/entities/activity-attachment.entity';

export class AttachmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty()
  readonly name!: string;

  @ApiProperty({ enum: ['application/pdf', 'image/png', 'image/jpeg'] })
  readonly mimeType!: string;

  @ApiProperty()
  readonly sizeBytes!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  readonly uploadedAt!: string;

  static from({
    id,
    originalName,
    mimeType,
    sizeBytes,
    uploadedAt,
  }: ActivityAttachment): AttachmentResponseDto {
    return { id, name: originalName, mimeType, sizeBytes, uploadedAt: uploadedAt.toISOString() };
  }
}

export class AttachmentUrlDto {
  @ApiProperty({ description: 'URL assinada, válida por 5 minutos' })
  readonly url!: string;
}
