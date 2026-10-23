import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const modelUrl =
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin";
const modelDirectory = resolve(process.cwd(), "models");
const modelPath = resolve(modelDirectory, "ggml-base.bin");
const temporaryModelPath = `${modelPath}.download`;

async function downloadModel() {
  await mkdir(modelDirectory, { recursive: true });

  const response = await fetch(modelUrl, {
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Model download failed with HTTP ${response.status}.`);
  }

  try {
    await pipeline(
      Readable.from(response.body),
      createWriteStream(temporaryModelPath),
    );
    await rename(temporaryModelPath, modelPath);
  } catch (error) {
    await rm(temporaryModelPath, { force: true });
    throw error;
  }

  console.log(`Downloaded multilingual Whisper base model to ${modelPath}`);
}

downloadModel().catch((error: unknown) => {
  console.error("Could not download local Whisper model:", error);
  process.exitCode = 1;
});
