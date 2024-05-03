import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class TelegrafService {
  private readonly logger = new Logger(TelegrafService.name);
  private bot: Telegraf;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.bot.start((ctx) =>
      ctx.reply('Welcome! 🎉 I am your Calorie Tracker Bot.'),
    );

    this.bot.on('photo', async (ctx) => {
      const photo = ctx.message.photo.pop(); // Get the highest resolution photo
      if (photo) {
        const fileId = photo.file_id;
        ctx.reply('Analyzing your photo... 🧐');
        const analysisResult = await this.analyzePhoto(fileId);
        if (analysisResult) {
          ctx.reply(
            `Hey, it looks like you had ${analysisResult.description} which I note down with ${analysisResult.calories} calories! 🍽️`,
          );
        } else {
          ctx.reply('Could not estimate calories from the image. 😕');
        }
      }
    });

    this.bot.launch();
  }

  async analyzePhoto(fileId: string) {
    const photoUrl = await this.bot.telegram.getFileLink(fileId);
    return await this.sendImageToOpenAI(photoUrl.toString()); // Convert URL object to string
  }

  async sendImageToOpenAI(photoUrl: string) {
    try {
      const headers = {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      };
      const prompt = `Analyze the meal in the image and respond with a JSON object containing two keys: 
      "calories" for the estimated total calorie count as an integer, 
      and "description" for a brief (10 words or less) description of the meal. Base your estimation on the fact that I live in Germany and take that into account when estimating package sizing.
      Respond in the following format:
      {
        "calories": 0,
        "description": ""
      }`;
      const payload = {
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: photoUrl, // Make sure this is correctly formatted
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      };

      const openAIResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        payload,
        { headers },
      );
      console.log(
        JSON.stringify(openAIResponse.data.choices[0].message, null, 2),
      );
      const responseContent = JSON.parse(
        openAIResponse.data.choices[0].message.content,
      );
      const description = responseContent.description;
      const calories = responseContent.calories;
      return { description, calories };
    } catch (error) {
      this.logger.error('Failed to analyze image.');
      return null;
    }
  }
}
