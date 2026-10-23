import { randomUUID } from "node:crypto";
import { Telegraf } from "telegraf";
import { prisma } from "../lib/prisma.js";
import { enqueueVoiceTranscription } from "../lib/queue.js";
import { publishTelegramTaskCreated } from "./publish-task.js";

const MAX_VOICE_FILE_SIZE = 20 * 1024 * 1024;
const MAX_VOICE_DURATION_SECONDS = 10 * 60;

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

export function createTelegramBot(token: string) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply(
      "Привет! Отправьте мне текст задачи или голосовое сообщение — я сохраню его в вашем списке задач.",
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      "Чтобы создать задачу, отправьте её текстом или запишите голосовое сообщение.",
    );
  });

  bot.on("text", async (ctx) => {
    const title = ctx.message.text.trim();

    if (!title) {
      await ctx.reply("Отправьте текст задачи.");
      return;
    }

    if (title.startsWith("/")) {
      await ctx.reply("Используйте /help или отправьте текст задачи.");
      return;
    }

    try {
      const task = await createTelegramTask(ctx.from.id, title);
      try {
        await publishTelegramTaskCreated(task);
      } catch (error) {
        console.error("Could not publish Telegram task-created event:", error);
      }
      await ctx.reply(`Задача сохранена: ${title}`);
    } catch (error) {
      console.error("Could not save Telegram text task:", error);
      await ctx.reply("Не удалось сохранить задачу. Попробуйте позже.");
    }
  });

  bot.on("voice", async (ctx) => {
    const voice = ctx.message.voice;

    if (voice.file_size && voice.file_size > MAX_VOICE_FILE_SIZE) {
      await ctx.reply("Голосовое сообщение слишком большое. Максимум — 20 МБ.");
      return;
    }

    if (voice.duration > MAX_VOICE_DURATION_SECONDS) {
      await ctx.reply("Голосовое сообщение длиннее 10 минут.");
      return;
    }

    await ctx.reply("Голосовое сообщение поставлено в очередь на распознавание...");

    try {
      const fileUrl = await ctx.telegram.getFileLink(voice.file_id);
      const response = await fetch(fileUrl, {
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Telegram file download failed (${response.status}).`);
      }

      const contentLength = Number(response.headers.get("content-length"));
      if (contentLength > MAX_VOICE_FILE_SIZE) {
        await ctx.reply("Голосовое сообщение слишком большое. Максимум — 20 МБ.");
        return;
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      if (audioBuffer.byteLength > MAX_VOICE_FILE_SIZE) {
        await ctx.reply("Голосовое сообщение слишком большое. Максимум — 20 МБ.");
        return;
      }

      if (audioBuffer.byteLength === 0) {
        throw new Error("Telegram returned an empty voice file.");
      }

      await enqueueVoiceTranscription(
        audioBuffer,
        ctx.from.id,
        ctx.chat.id,
        ctx.message.message_id,
      );
    } catch (error) {
      console.error("Telegram voice queueing failed:", error);
      await ctx.reply(
        "Не удалось поставить голосовое сообщение в очередь. Проверьте подключение к Redis или попробуйте ещё раз.",
      );
    }
  });

  bot.catch((error, ctx) => {
    console.error(`Telegram update ${ctx.update.update_id} failed:`, error);
  });

  return bot;
}
