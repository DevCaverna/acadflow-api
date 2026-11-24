import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, type SelectQueryBuilder } from 'typeorm';
import type { Listing } from '@/common/dto/listing.dto';
import type { PaginationOptionsDto } from '@/common/dto/pagination-options.dto';
import type {
  DisciplineFilterDto,
  DisciplineSortField,
} from '@/modules/disciplines/dto/discipline-filter.dto';
import { DisciplineResponseDto } from '@/modules/disciplines/dto/discipline-response.dto';
import { Discipline } from '@/modules/disciplines/entities/discipline.entity';
import { Enrollment } from '@/modules/enrollments/entities/enrollment.entity';
import type { User } from '@/modules/users/entities/user.entity';

const SORT_COLUMNS: Readonly<Record<DisciplineSortField, string>> = {
  code: 'discipline.code',
  name: 'discipline.name',
  semester: 'discipline.semester',
};

@Injectable()
export class DisciplinesService {
  constructor(
    @InjectRepository(Discipline)
    private readonly disciplineRepository: Repository<Discipline>,
  ) {}

  async findAll({
    user,
    paginationOptionsDto,
  }: {
    user: User;
    paginationOptionsDto: PaginationOptionsDto<DisciplineFilterDto>;
  }): Promise<Listing<DisciplineResponseDto>> {
    const { page, perPage, filter, sortField, sortDirection } = paginationOptionsDto;

    const qb = this.disciplineRepository
      .createQueryBuilder('discipline')
      .innerJoin('discipline.professor', 'professor')
      .addSelect(['professor.id', 'professor.name']);

    this.applyVisibility(qb, { user });
    this.applyFilter(qb, { filter });

    const [disciplines, total] = await qb
      .orderBy(
        SORT_COLUMNS[(sortField ?? 'name') as DisciplineSortField],
        sortDirection === 'desc' ? 'DESC' : 'ASC',
      )
      .addOrderBy('discipline.id', 'ASC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    return {
      data: disciplines.map((discipline) => DisciplineResponseDto.from(discipline)),
      total,
      page,
      perPage,
    };
  }

  private applyVisibility(qb: SelectQueryBuilder<Discipline>, { user }: { user: User }): void {
    if (user.role === 'PROFESSOR') {
      qb.andWhere('discipline.professorId = :userId', { userId: user.id });
      return;
    }
    qb.innerJoin(
      Enrollment,
      'enrollment',
      'enrollment.disciplineId = discipline.id AND enrollment.studentId = :userId',
      { userId: user.id },
    );
  }

  private applyFilter(
    qb: SelectQueryBuilder<Discipline>,
    { filter }: { filter?: DisciplineFilterDto },
  ): void {
    if (filter?.semester) {
      qb.andWhere('discipline.semester = :semester', { semester: filter.semester });
    }
    if (filter?.search) {
      const search = `%${filter.search.replace(/[\\%_]/g, '\\$&')}%`;
      qb.andWhere(
        new Brackets((where) =>
          where
            .where('discipline.name ILIKE :search', { search })
            .orWhere('discipline.code ILIKE :search', { search }),
        ),
      );
    }
  }
}
