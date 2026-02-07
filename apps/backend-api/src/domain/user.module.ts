import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from '../adapter/storage/entities/user.entity';
import { UserRepository } from '../adapter/storage/repository/user.repository';
import { USER_REPOSITORY } from '../port/repository';
import { USER_SERVICE } from '../port/service';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
  ],
  providers: [
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
    {
      provide: USER_SERVICE,
      useClass: UserService,
    },
  ],
  exports: [USER_SERVICE, USER_REPOSITORY],
})
export class UserModule {}
