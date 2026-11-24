import { randomUUID } from 'node:crypto';
import { basename } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiException } from '@/common/filters/api.exception';
import { ActivitiesService } from '@/modules/activities/activities.service';
import {
  AttachmentResponseDto,
  type AttachmentUrlDto,
} from '@/modules/activities/dto/attachment-response.dto';
import { ActivityAttachment } from '@/modules/activities/entities/activity-attachment.entity';
import { detectAttachmentType } from '@/modules/storage/file-type';
import { StorageService } from '@/modules/storage/storage.service';
import type { User } from '@/modules/users/entities/user.entity';

const MAX_NAME_LENGTH = 255;

function decodeName(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return basename(decoded.replaceAll('\\', '/'))
    .replace(/\p{Cc}/gu, '')
    .trim();
}

@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    @InjectRepository(ActivityAttachment)
    private readonly attachmentRepository: Repository<ActivityAttachment>,
    private readonly activitiesService: ActivitiesService,
    private readonly storage: StorageService,
  ) {}

  async findAll({
    user,
    activityId,
  }: {
    user: User;
    activityId: string;
  }): Promise<AttachmentResponseDto[]> {
    await this.activitiesService.findVisibleOrFail({ user, id: activityId });
    const attachments = await this.attachmentRepository.find({
      where: { activityId },
      order: { id: 'ASC' },
    });
    return attachments.map((attachment) => AttachmentResponseDto.from(attachment));
  }

  async create({
    professorId,
    activityId,
    body,
    fileName,
  }: {
    professorId: string;
    activityId: string;
    body: Buffer;
    fileName: string;
  }): Promise<AttachmentResponseDto> {
    await this.activitiesService.findOwnedOrFail({ professorId, id: activityId });
    if (!this.storage.enabled) throw new ApiException('STORAGE_UNAVAILABLE');

    const originalName = decodeName(fileName);
    const mimeType = await detectAttachmentType({ body, name: originalName });
    if (!mimeType || originalName.length > MAX_NAME_LENGTH) {
      throw new ApiException('VALIDATION_ERROR');
    }

    const objectKey = `activities/${activityId}/${randomUUID()}`;
    await this.storage.upload({ key: objectKey, body, contentType: mimeType });
    const attachment = this.attachmentRepository.create({
      activityId,
      objectKey,
      originalName,
      mimeType,
      sizeBytes: body.length,
    });
    try {
      await this.attachmentRepository.insert(attachment);
    } catch (error: unknown) {
      await this.removeObject({ key: objectKey });
      throw error;
    }
    return AttachmentResponseDto.from(attachment);
  }

  async getUrl({ user, id }: { user: User; id: string }): Promise<AttachmentUrlDto> {
    const { activityId, objectKey, originalName } = await this.findOrFail({ id });
    await this.activitiesService.findVisibleOrFail({ user, id: activityId });
    return {
      url: await this.storage.getSignedUrl({ key: objectKey, downloadName: originalName }),
    };
  }

  async remove({ professorId, id }: { professorId: string; id: string }): Promise<void> {
    const { activityId, objectKey } = await this.findOrFail({ id });
    await this.activitiesService.findOwnedOrFail({ professorId, id: activityId });
    await this.attachmentRepository.delete({ id });
    await this.removeObject({ key: objectKey });
  }

  private async findOrFail({ id }: { id: string }): Promise<ActivityAttachment> {
    const attachment = await this.attachmentRepository.findOneBy({ id });
    if (!attachment) throw new ApiException('NOT_FOUND');
    return attachment;
  }

  private async removeObject({ key }: { key: string }): Promise<void> {
    try {
      await this.storage.remove({ key });
    } catch (error: unknown) {
      this.logger.warn(`Could not remove object ${key}: ${String(error)}`);
    }
  }
}
