import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiException } from '@/common/filters/api.exception';
import { createAvatar } from '@/modules/storage/file-type';
import { StorageService } from '@/modules/storage/storage.service';
import { UserResponseDto } from '@/modules/users/dto/user-response.dto';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class AvatarsService {
  private readonly logger = new Logger(AvatarsService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly storage: StorageService,
  ) {}

  async toResponse({ user }: { user: User }): Promise<UserResponseDto> {
    const avatarUrl =
      user.avatarKey && this.storage.enabled
        ? await this.storage.getSignedUrl({ key: user.avatarKey })
        : null;
    return UserResponseDto.from(user, { avatarUrl });
  }

  async update({ user, body }: { user: User; body: Buffer }): Promise<UserResponseDto> {
    if (!this.storage.enabled) throw new ApiException('STORAGE_UNAVAILABLE');
    const avatar = await createAvatar({ body });
    if (!avatar) throw new ApiException('VALIDATION_ERROR');

    const key = `avatars/${user.id}/${randomUUID()}.webp`;
    await this.storage.upload({ key, body: avatar, contentType: 'image/webp' });
    await this.replace({ user, key });
    return this.toResponse({ user });
  }

  async remove({ user }: { user: User }): Promise<void> {
    await this.replace({ user, key: null });
  }

  private async replace({ user, key }: { user: User; key: string | null }): Promise<void> {
    const previousKey = user.avatarKey;
    try {
      await this.userRepository.update({ id: user.id }, { avatarKey: key });
    } catch (error: unknown) {
      if (key) await this.removeObject({ key });
      throw error;
    }
    user.avatarKey = key;
    if (previousKey) await this.removeObject({ key: previousKey });
  }

  private async removeObject({ key }: { key: string }): Promise<void> {
    try {
      await this.storage.remove({ key });
    } catch (error: unknown) {
      this.logger.warn(`Could not remove object ${key}: ${String(error)}`);
    }
  }
}
