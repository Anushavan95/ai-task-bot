import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Telegraf } from "telegraf";
import { prisma } from "../lib/prisma.js";
import { createTranscriptionWorker } from "../lib/queue.js";
import { transcribeTelegramVoice } from "../telegram/transcription.js";
import { publishTelegramTaskCreated } from "../telegram/publish-task.js";

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramToken) {
  throw new Error("TELEGRAM_BOT_TOKEN is not configured for the transcription worker.");
}

const bot = new Telegraf(telegramToken);

async function createTelegramTask(telegramUserId: number, title: string) {
  const user = await prisma.user.upsert({
    where: { telegramId: String(telegramUserId) },
    update: {},
    create: {
      id: randomUUID(),
      telegramId: String(telegramUserId),
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  return prisma.task.create({
    data: {
      title,
      source: "TELEGRAM",
      userId: user.id,
    },
  });
}

const worker = createTranscriptionWorker(async (job) => {
  const { audioBase64, telegramUserId, chatId } = job.data;
  const title = await transcribeTelegramVoice(Buffer.from(audioBase64, "base64"));

  if (!title) {
    throw new Error("The transcription worker received an empty transcript.");
  }

  const task = await createTelegramTask(telegramUserId, title);

  try {
    await publishTelegramTaskCreated(task);
  } catch (error) {
    console.error("Could not publish task-created event from the worker:", error);
  }

  await bot.telegram.sendMessage(
    chatId,
    `Голосовая задача сохранена: ${title}`,
  );
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; stopping transcription worker.`);
  await worker.close();
  await prisma.$disconnect();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

worker.on("error", (error: Error) => {
  console.error("Transcription worker encountered an error:", error);
});

void worker
  .waitUntilReady()
  .then(() => {
    console.log("Transcription worker is running.");
  })
  .catch(async (error: unknown) => {
    console.error("Could not connect transcription worker to Redis:", error);
    await worker.close();
    await prisma.$disconnect();
    process.exitCode = 1;
  });
