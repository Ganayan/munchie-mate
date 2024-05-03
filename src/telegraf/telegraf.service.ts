import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class TelegrafService implements OnModuleInit {
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.bot.start((ctx) => {
      ctx.reply(
        'Welcome! I am your Calorie Tracker Bot. Send me a photo of your meal, and I’ll tell you its calorie content.',
      );
    });
  }

  onModuleInit() {
    console.log('Bot is running');
    this.bot.launch();
  }
}
