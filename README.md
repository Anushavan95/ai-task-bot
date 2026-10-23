# AI Task Bot

This project contains a Next.js dashboard frontend, an Express API, a Telegram bot, and a local Whisper transcription worker. The app stores task records in PostgreSQL and uses Redis + BullMQ for asynchronous voice processing.

## Architecture

- Frontend: `frontend/` Next.js app
- API: `backend/src/server.ts` Express API (host port `4001` in Docker)
- Bot: `backend/src/bot/bot.ts` Telegram polling process, run on Windows x64 or macOS ARM64
- Worker: `backend/src/workers/transcription.worker.ts` local Redis/BullMQ consumer for voice jobs
- Database: PostgreSQL via Prisma in `backend/src/prisma/schema.prisma`
- Cache/queue: Redis on port `6379`

## Repository layout

- `backend/` — API, Prisma schema, Telegram bot, voice transcription, worker
- `frontend/` — dashboard UI and realtime client
- `docker-compose.yml` — local orchestration for API, frontend, and Redis

## Quick start

1. Copy the sample environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your Telegram bot token, database credentials, and random secrets. Ensure `DATABASE_URL` and `DATABASE_URL_DOCKER` use the same PostgreSQL username, password, and database.

3. Start the API, Redis, and frontend:

   ```bash
   docker compose up -d --build api frontend
   ```

   PostgreSQL must be running separately and reachable using the values in `.env`.

4. On Windows x64 or macOS ARM64, configure `backend/.env` to use host-accessible database/Redis URLs, use the same bot and internal-event tokens as the root `.env`, and set `REALTIME_SERVER_URL=http://localhost:4001`. Start the bot and worker in separate backend terminals:

   If it does not exist yet, create it from the sample:

   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

   ```powershell
   cd backend
   npm run dev:bot
   ```

   ```powershell
   cd backend
   npm run dev:worker
   ```

   The current `whisper-cpp-node` package does not provide a Linux x64 native binary, so the bot and voice worker run on the supported host rather than inside Docker.

5. Open the dashboard at `http://localhost:3001`. The API health endpoint is `http://localhost:4001/api/health`.

## Telegram bot setup

To use your own Telegram bot:

1. Open Telegram and start a chat with `@BotFather`.
2. Send `/newbot` and follow the prompts.
3. Choose a bot name and username.
4. Copy the token returned by BotFather.
5. Paste it into `.env` as `TELEGRAM_BOT_TOKEN`.

The bot process reads `TELEGRAM_BOT_TOKEN` at startup. It will fail with a clear error if the variable is missing.

## Environment variables

The project expects these environment values:

- `DATABASE_URL` — PostgreSQL connection string. For Docker, use the internal Postgres service hostname (`postgres`). For local dev, use `localhost`.
- `REDIS_URL` — Redis connection string. For Docker, use `redis://redis:6379`.
- `DATABASE_URL_DOCKER` — connection URL used by the API container; credentials must match the PostgreSQL role/database.
- `TELEGRAM_BOT_TOKEN` — bot token from BotFather.
- `INTERNAL_EVENTS_TOKEN` — shared secret for internal task-published Socket.IO events.
- `FRONTEND_URL` — browser-facing origin for the API and Socket.IO server (typically `http://localhost:3000`).
- `NEXT_PUBLIC_API_URL` — browser-safe API base URL, for example `http://localhost:4000/api`.
- `NEXT_PUBLIC_REALTIME_URL` — browser-safe realtime endpoint, typically `http://localhost:4000`.
- `REALTIME_SERVER_URL` — internal Docker hostname for bot-to-API communication, typically `http://api:4000`.
- `OPENAI_API_KEY` — optional; not required for the current local Whisper transcription flow.

## Database and Prisma

The Prisma schema lives in `backend/src/prisma/schema.prisma`.

To initialize or migrate a local database:

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma generate
```

For this Compose setup, PostgreSQL runs separately and must be available before starting the API. Do not run destructive commands such as `prisma migrate reset` or `docker compose down -v` unless you explicitly want to discard local data.

## Redis and worker configuration

Redis is required for the BullMQ transcription queue. Run the worker on the supported host; it consumes jobs from the `transcription` queue. The bot responds immediately after enqueueing a voice job, while the worker transcribes the audio and creates the database task asynchronously.

Voice transcription currently uses the local Whisper model via `whisper-cpp-node`, not an OpenAI API call. If the model file is missing, download it once to `backend/models/ggml-base.bin` on the host. The package does not include a Linux x64 binary, so do not run the bot or worker in Linux Docker containers.

## Local development without Docker

Start PostgreSQL, then run API and Redis in Docker or use the commands above. For a fully local setup, run these in separate backend terminals:

```bash
cd backend
npm install
npm run download:whisper-model
```

Run the bot and worker in separate terminals:

```bash
cd backend
npm run dev:bot
```

```bash
cd backend
npm run dev:worker
```

Run the API in another terminal:

```bash
cd backend
npm run dev:api
```

Then start the frontend:

```bash
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

For this local-only setup, configure `backend/.env` with PostgreSQL and Redis on `localhost`, and set `REALTIME_SERVER_URL=http://localhost:4000`.

## Troubleshooting

- If the frontend cannot reach the API, confirm `NEXT_PUBLIC_API_URL` matches the host machine URL, not a Docker-only hostname.
- If the bot does not start, check that `TELEGRAM_BOT_TOKEN` exists in `backend/.env`, matches the root `.env` token, and the bot was created through BotFather.
- If PostgreSQL fails to start, verify the Postgres credentials in `.env` match `DATABASE_URL`.
- If the worker is idle, confirm Redis is healthy and the `transcription` queue is reachable at `REDIS_URL`.
