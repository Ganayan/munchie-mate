import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class TelegrafService {
  private readonly logger = new Logger(TelegrafService.name);
  private bot: Telegraf;
  private dailyCalorieLimit: { [userId: number]: number } = {};
  private caloriesConsumed: { [userId: number]: number } = {};

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    this.bot.start((ctx) =>
      ctx.reply(
        'Hello there! 🌟 I’m your friendly Calorie Tracker Bot! Ready to dive into your nutrition journey? 🚀',
      ),
    );

    this.bot.command('setCalories', (ctx) => {
      const args = ctx.message.text.split(' ').slice(1); // Get arguments after the command
      if (args.length > 0 && !isNaN(parseInt(args[0]))) {
        this.dailyCalorieLimit[ctx.from.id] = parseInt(args[0]);
        this.caloriesConsumed[ctx.from.id] = 0; // Reset calories consumed when setting a new limit
        ctx.reply(
          `Yay! 🎉 Your daily calorie goal is now set at ${args[0]} kcal! Let's make today a healthy one! 🍏`,
        );
      } else {
        ctx.reply(
          'Oops! Please send me a valid number to set your calorie goal. 💪',
        );
      }
    });

    this.bot.command('getCalories', (ctx) => {
      const userId = ctx.from.id;
      const caloriesLeft =
        this.dailyCalorieLimit[userId] - this.caloriesConsumed[userId];
      if (this.dailyCalorieLimit[userId]) {
        ctx.reply(
          `You've consumed ${this.caloriesConsumed[userId]} kcal today and have ${caloriesLeft} kcal left to enjoy! 🎉`,
        );
      } else {
        ctx.reply(
          'You haven’t set your daily calorie goal yet! Use /setCalories to set it. 💪',
        );
      }
    });

    this.bot.on('photo', async (ctx) => {
      const photo = ctx.message.photo.pop(); // Get the highest resolution photo
      if (photo) {
        const fileId = photo.file_id;
        ctx.reply(
          'Hold tight! 🕵️‍♂️ I’m analyzing your photo to count those calories...',
        );
        const analysisResult = await this.analyzePhoto(fileId);
        if (analysisResult) {
          const userId = ctx.from.id;
          const calories = analysisResult.calories;
          if (this.caloriesConsumed[userId] === undefined) {
            this.caloriesConsumed[userId] = 0;
          }
          this.caloriesConsumed[userId] += calories;
          const caloriesLeft =
            this.dailyCalorieLimit[userId] - this.caloriesConsumed[userId];
          ctx.reply(
            `Wow! You had ${analysisResult.description} adding up to ${calories} calories. 🍴 You've got ${caloriesLeft} kcal left to enjoy today! Keep going! 🔥`,
          );
        } else {
          ctx.reply(
            'Hmm, I couldn’t figure out the calories this time. 😢 Try another pic or check back later!',
          );
        }
      }
    });

    this.bot.launch();
  }

  async analyzePhoto(fileId: string) {
    const photoUrl = await this.bot.telegram.getFileLink(fileId);
    return await this.sendImageToOpenAI(photoUrl.toString());
  }

  async sendImageToOpenAI(photoUrl: string) {
    try {
      const headers = {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      };
      const prompt = `Analyze the meal in the image and respond with a JSON object containing two keys: "calories" for the estimated total calorie count as an integer, and "description" for a brief (10 words or less) description of the meal. Base your estimation on the fact that I live in Germany and take that into account when estimating package sizing. Respond in the following format: { "calories": 0, "description": "" }`;
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
                image_url: { url: photoUrl },
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
        JSON.stringify(openAIResponse.data.choices[0].message.content, null, 2),
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
