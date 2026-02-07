import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';
import { IAppConfig } from './configuration';
import { setupSwagger } from './utils/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<IAppConfig>>(ConfigService);
  
  const apiPrefix = configService.get<string>('apiPrefix', 'api');
  const port = configService.get<number>('port', 3000);
  const nodeEnv = configService.get<string>('nodeEnv', 'development');
  const corsConfig = configService.get<IAppConfig['cors']>('cors');
  const corsEnabled = corsConfig?.enabled ?? true;
  const corsOrigin = corsConfig?.origin ?? '*';

  app.setGlobalPrefix(apiPrefix);

  if (corsEnabled) {
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });
  }

  if (nodeEnv !== 'production') {
    const swaggerPath = `${apiPrefix}/docs`;
    setupSwagger(app, swaggerPath);
    Logger.log(`📚 Swagger documentation: http://localhost:${port}/${swaggerPath}`);
  }

  process.on('uncaughtException', (err) => {
    new Logger().error('Uncaught Exception', err);
  });

  await app.listen(port).then(() => {
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  });
}

bootstrap().catch((error) => {
  Logger.error('[Backend API] Error starting application...', error);
});
