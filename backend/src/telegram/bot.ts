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
      "Hello! Send me a task as text or a voice message, and I'll save it to your task list.",
    );
  });

  bot.help(async (ctx) => {
    await ctx.reply(
      "To create a task, send it as text or record a voice message.",
    );
  });

  bot.on("text", async (ctx) => {
    const title = ctx.message.text.trim();

    if (!title) {
      await ctx.reply("Please send a task as text.");
      return;
    }

    if (title.startsWith("/")) {
      await ctx.reply("Use /help or send a task as text.");
      return;
    }

    try {
      const task = await createTelegramTask(ctx.from.id, title);
      try {
        await publishTelegramTaskCreated(task);
      } catch (error) {
        console.error("Could not publish Telegram task-created event:", error);
      }
      await ctx.reply(`Task saved: ${title}`);
    } catch (error) {
      console.error("Could not save Telegram text task:", error);
      await ctx.reply("Could not save the task. Please try again later.");
    }
  });

  bot.on("voice", async (ctx) => {
    const voice = ctx.message.voice;

    if (voice.file_size && voice.file_size > MAX_VOICE_FILE_SIZE) {
      await ctx.reply("The voice message is too large. The maximum size is 20 MB.");
      return;
    }

    if (voice.duration > MAX_VOICE_DURATION_SECONDS) {
      await ctx.reply("The voice message is longer than 10 minutes.");
      return;
    }

    await ctx.reply("Your voice message has been queued for transcription...");

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
        await ctx.reply("The voice message is too large. The maximum size is 20 MB.");
        return;
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      if (audioBuffer.byteLength > MAX_VOICE_FILE_SIZE) {
        await ctx.reply("The voice message is too large. The maximum size is 20 MB.");
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
        "Could not queue the voice message. Check the Redis connection or try again.",
      );
    }
  });

  bot.catch((error, ctx) => {
    console.error(`Telegram update ${ctx.update.update_id} failed:`, error);
  });

  return bot;
}
