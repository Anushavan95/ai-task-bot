
import "dotenv/config";
import { createTelegramBot } from "../telegram/bot.js";
import { releaseLocalWhisper } from "../telegram/transcription.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured in backend/.env.");
  }

  const bot = createTelegramBot(token);

  const stop = async (signal: string) => {
    console.log(`Received ${signal}; stopping Telegram bot.`);
    bot.stop(signal);
    await releaseLocalWhisper();
    await prisma.$disconnect();
  };

  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));

  void bot
    .launch({}, () => {
      console.log("Telegram task bot is running.");
    })
    .catch(async (error: unknown) => {
      console.error("Could not start Telegram task bot:", error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}

main().catch(async (error: unknown) => {
  console.error("Could not start Telegram bot:", error);
  await prisma.$disconnect();
  process.exitCode = 1;
});
