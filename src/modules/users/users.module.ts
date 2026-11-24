import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getUploadOptions } from '@/config/upload.config';
import { StorageModule } from '@/modules/storage/storage.module';
import { AvatarsService } from '@/modules/users/avatars.service';
import { User } from '@/modules/users/entities/user.entity';
import { UsersController } from '@/modules/users/users.controller';
import { UsersService } from '@/modules/users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    StorageModule,
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        getUploadOptions({ config, key: 'AVATAR_MAX_BYTES', defaultBytes: 2 * 1024 * 1024 }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, AvatarsService],
  exports: [UsersService, AvatarsService],
})
export class UsersModule {}
