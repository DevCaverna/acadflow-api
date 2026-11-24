import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
}
