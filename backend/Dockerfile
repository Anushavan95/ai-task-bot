
FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY tsconfig.json ./
COPY src ./src

RUN DATABASE_URL="postgresql://taskbot:build-placeholder@localhost:5432/ai_task_bot" npx prisma generate


FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/src ./src
COPY --from=base /app/prisma.config.ts ./prisma.config.ts
COPY --from=base /app/tsconfig.json ./tsconfig.json
COPY --from=base /app/generated ./generated

RUN mkdir -p /app/models

EXPOSE 4000

CMD ["npm", "run", "start:api"]
