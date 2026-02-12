import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from '../configuration';
import { CustomExceptionFilter } from '../utils/filter';
import { LoggingInterceptor } from '../utils/interceptor';
import { CustomValidationPipe } from '../utils/pipe/validation.pipe';
import { StorageModule } from '../adapter/storage/storage.module';
import { UserApiModule } from '../adapter/api/user.module';
import { GameModule } from './modules/game/game.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: ['apps/backend-api/.env', '.env'],
    }),
    StorageModule,
    UserApiModule,
    GameModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: CustomExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
