import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinesModule } from '@/modules/disciplines/disciplines.module';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import { EnrollmentsController } from '@/modules/enrollments/enrollments.controller';
import { EnrollmentsService } from '@/modules/enrollments/enrollments.service';
import { User } from '@/modules/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, User]), DisciplinesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
