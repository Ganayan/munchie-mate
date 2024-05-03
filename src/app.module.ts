// src/app.module.ts
import { Module } from '@nestjs/common';
import { TelegrafModule } from './telegraf/telegraf.module';

@Module({
  imports: [TelegrafModule],
})
export class AppModule {}
