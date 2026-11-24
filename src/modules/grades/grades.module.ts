import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { Discipline } from '@/modules/disciplines/entities/discipline.entity';
import { DisciplinesModule } from '@/modules/disciplines/disciplines.module';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { EnrollmentsModule } from '@/modules/enrollments/enrollments.module';
import { Grade } from '@/modules/grades/entities/grade.entity';
import { GradesController } from '@/modules/grades/grades.controller';
import { GradesService } from '@/modules/grades/grades.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Grade, Activity, Discipline, Enrollment]),
    DisciplinesModule,
    EnrollmentsModule,
  ],
  controllers: [GradesController],
  providers: [GradesService],
})
export class GradesModule {}
