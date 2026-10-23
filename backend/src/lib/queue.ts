import IORedis from "ioredis";
import { Queue, Worker, type Job } from "bullmq";

export const TRANSCRIPTION_QUEUE_NAME = "transcription";

export type TranscriptionJobData = {
  audioBase64: string;
  telegramUserId: number;
  chatId: number;
  messageId?: number;
};

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export const transcriptionQueue = new Queue(TRANSCRIPTION_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 60 * 60,
      count: 50,
    },
    removeOnFail: {
      age: 24 * 60 * 60,
      count: 100,
    },
  },
});

export async function enqueueVoiceTranscription(
  audio: Buffer,
  telegramUserId: number,
  chatId: number,
  messageId?: number,
): Promise<Job<TranscriptionJobData>> {
  return transcriptionQueue.add(
    "transcribe-voice",
    {
      audioBase64: audio.toString("base64"),
      telegramUserId,
      chatId,
      messageId,
    },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        count: 50,
      },
      removeOnFail: {
        count: 100,
      },
    },
  );
}

export function createTranscriptionWorker(
  handler: (job: Job<TranscriptionJobData>) => Promise<void>,
) {
  return new Worker(
    TRANSCRIPTION_QUEUE_NAME,
    async (job) => {
      await handler(job);
    },
    {
      connection: redis,
      concurrency: 1,
      removeOnComplete: {
        count: 50,
      },
      removeOnFail: {
        count: 100,
      },
    },
  );
}
