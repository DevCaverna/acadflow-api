import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinesModule } from '@/modules/disciplines/disciplines.module';
import { Activity } from '@/modules/activities/entities/activity.entity';
import { Discipline } from '@/modules/disciplines/entities/discipline.entity';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { EnrollmentsController } from '@/modules/enrollments/enrollments.controller';
import { EnrollmentsService } from '@/modules/enrollments/enrollments.service';
import { Grade } from '@/modules/grades/entities/grade.entity';
import { User } from '@/modules/users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, User, Activity, Discipline, Grade]),
    DisciplinesModule,
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
