// src/telegraf/telegraf.module.ts
import { Module } from '@nestjs/common';
import { TelegrafService } from './telegraf.service';

@Module({
  providers: [TelegrafService],
  exports: [TelegrafService],
})
export class TelegrafModule {}
