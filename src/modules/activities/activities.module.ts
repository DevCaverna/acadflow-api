import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivitiesController } from '@/modules/activities/activities.controller';
import { ActivitiesService } from '@/modules/activities/activities.service';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { DisciplinesModule } from '@/modules/disciplines/disciplines.module';

@Module({
  imports: [TypeOrmModule.forFeature([Activity]), DisciplinesModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
