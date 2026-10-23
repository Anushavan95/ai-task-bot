# Backend

## Telegram bot with local voice transcription

Voice messages are transcribed locally with `whisper.cpp` via the shared worker process. The bot responds immediately and enqueues audio in Redis/BullMQ; the worker performs inference and saves the resulting task to PostgreSQL.

The system does not send audio to OpenAI and does not require `OPENAI_API_KEY` for the local Whisper flow. FFmpeg converts Telegram's OGG/Opus audio to PCM before transcription. The current `whisper-cpp-node` package does not ship a Linux x64 native binary, so run the Telegram bot and transcription worker directly on a supported host (Windows x64 or macOS ARM64), not in the Linux Docker containers.

## Environment requirements

The backend requires:

- `DATABASE_URL`
- `REDIS_URL`
- `TELEGRAM_BOT_TOKEN`
- `INTERNAL_EVENTS_TOKEN`
- `FRONTEND_URL`

The root `.env.example` file documents the expected values for local and Docker execution.

## Local development

Start the API, Redis, and frontend containers from the repository root:

```powershell
docker compose up -d --build api frontend
```

The PostgreSQL server must also be running and its credentials must match `DATABASE_URL_DOCKER` in the root `.env` file.

On a supported host, install backend dependencies and download the model once if it is not already present:

```powershell
cd backend
npm install
npm run download:whisper-model
```

Set the host-side values in `backend/.env` so `DATABASE_URL` uses `localhost`, `REDIS_URL` is `redis://localhost:6379`, and `REALTIME_SERVER_URL` points to the API's host port (for the supplied Compose mapping, `http://localhost:4001`). Keep the bot token and internal event token in this file as well.

Run these commands in two separate backend terminals:

```powershell
npm run dev:bot
```

```powershell
npm run dev:worker
```

The multilingual Whisper base model is stored at `backend/models/ggml-base.bin` (about 148 MB) and is ignored by Git. Text messages create tasks directly; voice messages are limited to 20 MB and 10 minutes.

## Live dashboard updates

The API server broadcasts `task:created` over Socket.IO when a task is created. The Telegram bot publishes task events to the API using `INTERNAL_EVENTS_TOKEN`, while the dashboard subscribes using `NEXT_PUBLIC_REALTIME_URL`.

## Docker execution

```bash
docker compose up -d --build api frontend
```

Compose runs the API, Redis, and frontend. Run the bot and worker on the supported host as described above so local Whisper can load its native runtime.

## Prisma and database

```bash
npx prisma generate
npx prisma migrate deploy
```

Do not run destructive commands such as `prisma migrate reset` or `docker compose down -v` unless you intentionally want to discard data.
