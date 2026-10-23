import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import ffmpegPath from "ffmpeg-static";
import {
  createWhisperContext,
  transcribeAsync,
  type WhisperContext,
} from "whisper-cpp-node";

const MODEL_PATH = resolve(__dirname, "../../models/ggml-base.bin");
const AUDIO_CONVERSION_TIMEOUT_MS = 60_000;

let whisperContext: WhisperContext | undefined;
let activeTranscription: Promise<string> | undefined;

async function convertOggToPcm(audio: Buffer): Promise<Float32Array> {
  if (!ffmpegPath) {
    throw new Error("FFmpeg binary is not available for this platform.");
  }

  const ffmpeg = spawn(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      "pipe:0",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-f",
      "f32le",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  const output: Buffer[] = [];
  const errorOutput: Buffer[] = [];
  let errorOutputLength = 0;

  const result = new Promise<Float32Array>((resolveResult, rejectResult) => {
    const timeout = setTimeout(() => {
      ffmpeg.kill();
      rejectResult(new Error("FFmpeg audio conversion timed out."));
    }, AUDIO_CONVERSION_TIMEOUT_MS);

    ffmpeg.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    ffmpeg.stderr.on("data", (chunk: Buffer) => {
      if (errorOutputLength < 4096) {
        errorOutput.push(chunk);
        errorOutputLength += chunk.length;
      }
    });

    ffmpeg.once("error", (error) => {
      clearTimeout(timeout);
      rejectResult(error);
    });

    ffmpeg.stdin.once("error", (error) => {
      clearTimeout(timeout);
      ffmpeg.kill();
      rejectResult(error);
    });

    ffmpeg.once("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        const details = Buffer.concat(errorOutput).toString("utf8").trim();
        rejectResult(
          new Error(details || `FFmpeg exited with code ${code ?? "unknown"}.`),
        );
        return;
      }

      const pcmBuffer = Buffer.concat(output);
      if (pcmBuffer.length === 0 || pcmBuffer.length % Float32Array.BYTES_PER_ELEMENT) {
        rejectResult(new Error("FFmpeg produced invalid PCM audio data."));
        return;
      }

      const alignedBuffer = pcmBuffer.buffer.slice(
        pcmBuffer.byteOffset,
        pcmBuffer.byteOffset + pcmBuffer.byteLength,
      );
      resolveResult(new Float32Array(alignedBuffer));
    });
  });

  ffmpeg.stdin.end(audio);

  return result;
}

async function getWhisperContext(): Promise<WhisperContext> {
  if (whisperContext) {
    return whisperContext;
  }

  try {
    await access(MODEL_PATH);
  } catch {
    throw new Error(
      "Local Whisper model is missing. Run `npm run download:whisper-model` from the backend folder.",
    );
  }

  whisperContext = createWhisperContext({
    model: MODEL_PATH,
    use_gpu: false,
    no_prints: true,
  });

  return whisperContext;
}

async function runTranscription(audio: Buffer): Promise<string> {
  const [context, pcm] = await Promise.all([
    getWhisperContext(),
    convertOggToPcm(audio),
  ]);
  const result = await transcribeAsync(context, {
    pcmf32: pcm,
    language: "auto",
    n_threads: Math.min(4, availableParallelism()),
    temperature: 0,
    print_progress: false,
    print_realtime: false,
    print_timestamps: false,
  });

  return result.segments
    .map((segment) => segment.text)
    .join(" ")
    .trim();
}

export async function transcribeTelegramVoice(audio: Buffer): Promise<string> {
  if (activeTranscription) {
    throw new Error("A voice message is already being transcribed.");
  }

  const currentTranscription = runTranscription(audio);
  activeTranscription = currentTranscription;

  try {
    return await currentTranscription;
  } finally {
    activeTranscription = undefined;
  }
}

export async function releaseLocalWhisper(): Promise<void> {
  if (activeTranscription) {
    await activeTranscription.catch(() => undefined);
  }

  whisperContext?.free();
  whisperContext = undefined;
}
