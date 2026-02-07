import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { IAppConfig } from '../../configuration';

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<IAppConfig>) => {
        const mongodbConfig = configService.get<IAppConfig['mongodb']>('mongodb');
        const uri = mongodbConfig?.uri || 'mongodb://localhost:27017/tet-holiday';
        console.log('MongoDB URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        return {
          uri,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class StorageModule {}
