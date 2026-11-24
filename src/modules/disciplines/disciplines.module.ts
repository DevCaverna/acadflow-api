import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisciplinesController } from '@/modules/disciplines/disciplines.controller';
import { DisciplinesService } from '@/modules/disciplines/disciplines.service';
import { Discipline } from '@/modules/disciplines/entities/discipline.entity';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Discipline, Enrollment])],
  controllers: [DisciplinesController],
  providers: [DisciplinesService],
  exports: [DisciplinesService],
})
export class DisciplinesModule {}
