
import "dotenv/config";
import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { Server } from "socket.io";
import { z } from "zod";
import app from "./app";
import { setRealtimeServer } from "./realtime/task-events.js";

const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const configuredOrigins = [
  FRONTEND_URL,
  ...((process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)),
].filter((origin, index, allOrigins) => allOrigins.indexOf(origin) === index);
const internalEventsToken = process.env.INTERNAL_EVENTS_TOKEN;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || configuredOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by Socket.IO.`));
    },
    credentials: true,
  },
});

setRealtimeServer(io);

const taskCreatedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
  source: z.enum(["TELEGRAM", "DASHBOARD"]),
  createdAt: z.coerce.date(),
});

io.use((socket, next) => {
  const auth = socket.handshake.auth as { role?: unknown; token?: unknown };

  if (auth.role !== "task-publisher" || typeof auth.token !== "string") {
    next();
    return;
  }

  if (!internalEventsToken) {
    next(new Error("Internal task publishing is not configured."));
    return;
  }

  const suppliedToken = Buffer.from(auth.token);
  const expectedToken = Buffer.from(internalEventsToken);
  const isAuthorized =
    suppliedToken.length === expectedToken.length &&
    timingSafeEqual(suppliedToken, expectedToken);

  if (!isAuthorized) {
    next(new Error("Unauthorized task publisher."));
    return;
  }

  socket.data.isTaskPublisher = true;
  next();
});

io.on("connection", (socket) => {
  if (!socket.data.isTaskPublisher) {
    return;
  }

  socket.on("task:publish", (payload: unknown, acknowledge: unknown) => {
    if (typeof acknowledge !== "function") {
      return;
    }

    const task = taskCreatedSchema.safeParse(payload);
    if (!task.success) {
      acknowledge({ ok: false, error: "Invalid task-created event payload." });
      return;
    }

    io.emit("task:created", {
      ...task.data,
      createdAt: task.data.createdAt.toISOString(),
    });
    acknowledge({ ok: true });
  });
});

httpServer.listen(PORT, () => {
  console.log(`Backend API is running on http://localhost:${PORT}`);
});
