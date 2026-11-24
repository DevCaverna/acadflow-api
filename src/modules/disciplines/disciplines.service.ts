import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, type SelectQueryBuilder } from 'typeorm';
import { isForeignKeyViolation, isUniqueViolation } from '@/common/database/postgres-error';
import type { Listing } from '@/common/dto/listing.dto';
import type { PaginationOptionsDto } from '@/common/dto/pagination-options.dto';
import { ApiException } from '@/common/filters/api.exception';
import type { CreateDisciplineDto } from '@/modules/disciplines/dto/create-discipline.dto';
import type {
  DisciplineFilterDto,
  DisciplineSortField,
} from '@/modules/disciplines/dto/discipline-filter.dto';
import { DisciplineResponseDto } from '@/modules/disciplines/dto/discipline-response.dto';
import type { UpdateDisciplineDto } from '@/modules/disciplines/dto/update-discipline.dto';
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
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
  ) {}

  async findAll({
    user,
    paginationOptionsDto,
  }: {
    user: User;
    paginationOptionsDto: PaginationOptionsDto<DisciplineFilterDto>;
  }): Promise<Listing<DisciplineResponseDto>> {
    const { page, perPage, filter, sortField, sortDirection } = paginationOptionsDto;

    const qb = this.createDisciplineQuery();

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

  async create({
    professor,
    createDisciplineDto,
  }: {
    professor: User;
    createDisciplineDto: CreateDisciplineDto;
  }): Promise<DisciplineResponseDto> {
    const { code, name, semester, description } = createDisciplineDto;
    const discipline = this.disciplineRepository.create({
      code,
      name,
      semester,
      description: description || null,
      professorId: professor.id,
    });
    try {
      await this.disciplineRepository.insert(discipline);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) throw new ApiException('CONFLICT');
      throw error;
    }
    return DisciplineResponseDto.from(Object.assign(discipline, { professor }));
  }

  async findOne({ user, id }: { user: User; id: string }): Promise<DisciplineResponseDto> {
    return DisciplineResponseDto.from(await this.findVisibleOrFail({ user, id }));
  }

  async update({
    professorId,
    id,
    updateDisciplineDto,
  }: {
    professorId: string;
    id: string;
    updateDisciplineDto: UpdateDisciplineDto;
  }): Promise<DisciplineResponseDto> {
    const discipline = await this.findOwnedOrFail({ professorId, id });
    const { name, description } = updateDisciplineDto;
    const changes: Partial<Pick<Discipline, 'name' | 'description'>> = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
    };
    if (Object.keys(changes).length > 0) {
      await this.disciplineRepository.update({ id, professorId }, changes);
    }
    return DisciplineResponseDto.from(Object.assign(discipline, changes));
  }

  async remove({ professorId, id }: { professorId: string; id: string }): Promise<void> {
    await this.findOwnedOrFail({ professorId, id });
    try {
      await this.disciplineRepository.delete({ id, professorId });
    } catch (error: unknown) {
      if (isForeignKeyViolation(error)) throw new ApiException('CONFLICT');
      throw error;
    }
  }

  async findVisibleOrFail({ user, id }: { user: User; id: string }): Promise<Discipline> {
    const discipline = await this.findByIdOrFail({ id });
    await this.assertCanView({ user, discipline });
    return discipline;
  }

  async findOwnedOrFail({
    professorId,
    id,
  }: {
    professorId: string;
    id: string;
  }): Promise<Discipline> {
    const discipline = await this.findByIdOrFail({ id });
    if (discipline.professorId !== professorId) throw new ApiException('FORBIDDEN');
    return discipline;
  }

  private createDisciplineQuery(): SelectQueryBuilder<Discipline> {
    return this.disciplineRepository
      .createQueryBuilder('discipline')
      .innerJoin('discipline.professor', 'professor')
      .addSelect(['professor.id', 'professor.name']);
  }

  private async findByIdOrFail({ id }: { id: string }): Promise<Discipline> {
    const discipline = await this.createDisciplineQuery()
      .where('discipline.id = :id', { id })
      .getOne();
    if (!discipline) throw new ApiException('NOT_FOUND');
    return discipline;
  }

  private async assertCanView({
    user,
    discipline,
  }: {
    user: User;
    discipline: Discipline;
  }): Promise<void> {
    const allowed =
      user.role === 'PROFESSOR'
        ? discipline.professorId === user.id
        : await this.enrollmentRepository.existsBy({
            studentId: user.id,
            disciplineId: discipline.id,
          });
    if (!allowed) throw new ApiException('FORBIDDEN');
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
