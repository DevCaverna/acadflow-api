import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '@/common/database/postgres-error';
import { ApiException } from '@/common/filters/api.exception';
import type { Role } from '@/common/types/role';
import { BCRYPT_ROUNDS } from '@/config/security.constants';
import { AvatarsService } from '@/modules/users/avatars.service';
import type { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';
import type { UpdateProfileDto } from '@/modules/users/dto/update-profile.dto';
import type { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly avatarsService: AvatarsService,
  ) {}

  findById({ id }: { id: string }): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async createAccount({
    name,
    email,
    role,
    password,
  }: {
    name: string;
    email: string;
    role: Role;
    password: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      name,
      email: email.toLowerCase(),
      role,
      passwordHash: await hash(password, BCRYPT_ROUNDS),
      avatarKey: null,
    });
    try {
      return await this.userRepository.save(user);
    } catch (error: unknown) {
      if (isUniqueViolation(error)) throw new ApiException('EMAIL_ALREADY_IN_USE');
      throw error;
    }
  }

  findByEmailWithPassword({ email }: { email: string }): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('lower(user.email) = lower(:email)', { email })
      .getOne();
  }

  async updateProfile({
    user,
    updateProfileDto,
  }: {
    user: User;
    updateProfileDto: UpdateProfileDto;
  }): Promise<UserResponseDto> {
    const { name, email } = updateProfileDto;
    const changes: Partial<Pick<User, 'name' | 'email'>> = {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email.toLowerCase() }),
    };
    if (Object.keys(changes).length > 0) {
      try {
        await this.userRepository.update({ id: user.id }, changes);
      } catch (error: unknown) {
        if (isUniqueViolation(error)) throw new ApiException('CONFLICT');
        throw error;
      }
    }
    return this.avatarsService.toResponse({ user: Object.assign(user, changes) });
  }

  async changePassword({
    userId,
    changePasswordDto,
  }: {
    userId: string;
    changePasswordDto: ChangePasswordDto;
  }): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;
    const { passwordHash } = await this.userRepository
      .createQueryBuilder('user')
      .select('user.id')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOneOrFail();
    if (!(await compare(currentPassword, passwordHash))) {
      throw new ApiException('INVALID_CURRENT_PASSWORD');
    }
    await this.userRepository.update(
      { id: userId },
      { passwordHash: await hash(newPassword, BCRYPT_ROUNDS) },
    );
  }
}
