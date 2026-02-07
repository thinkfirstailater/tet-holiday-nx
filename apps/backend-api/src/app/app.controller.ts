import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { IAppConfig } from '../configuration';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService<IAppConfig>,
  ) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('config')
  getConfig() {
    return {
      nodeEnv: this.configService.get<string>('nodeEnv'),
      apiPrefix: this.configService.get<string>('apiPrefix'),
    };
  }
}
