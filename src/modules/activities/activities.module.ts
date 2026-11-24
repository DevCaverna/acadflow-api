import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from '@/modules/activities/activities.controller';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { AttachmentsController } from '@/modules/activities/attachments.controller';
import { AttachmentsService } from '@/modules/activities/attachments.service';
import { ActivityAttachment } from '@/modules/activities/entities/activity-attachment.entity';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { getUploadOptions } from '@/config/upload.config';
import { DisciplinesModule } from '@/modules/disciplines/disciplines.module';
import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Activity, ActivityAttachment]),
    DisciplinesModule,
    StorageModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        getUploadOptions({ config, key: 'ATTACHMENT_MAX_BYTES', defaultBytes: 10 * 1024 * 1024 }),
    }),
  ],
  controllers: [ActivitiesController, AttachmentsController],
  providers: [ActivitiesService, AttachmentsService],
})
export class ActivitiesModule {}
