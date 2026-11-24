import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { isUniqueViolation } from '@/common/database/postgres-error';
import { ApiException } from '@/common/filters/api.exception';
import { BCRYPT_ROUNDS } from '@/config/security.constants';
import type { ChangePasswordDto } from '@/modules/users/dto/change-password.dto';
import type { UpdateProfileDto } from '@/modules/users/dto/update-profile.dto';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

  findById({ id }: { id: string }): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
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
    return UserResponseDto.from(Object.assign(user, changes));
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
