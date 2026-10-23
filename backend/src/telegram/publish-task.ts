import { io } from "socket.io-client";
import type { TaskCreatedEvent } from "../realtime/task-events.js";
import type { Task } from "../../generated/prisma/client.js";

type PublishAcknowledgement = {
  ok: boolean;
  error?: string;
};

const SOCKET_CONNECT_TIMEOUT_MS = 5_000;
const SOCKET_ACK_TIMEOUT_MS = 5_000;

export async function publishTelegramTaskCreated(task: Task): Promise<void> {
  const token = process.env.INTERNAL_EVENTS_TOKEN;
  if (!token) {
    throw new Error("INTERNAL_EVENTS_TOKEN is required to publish task events.");
  }

  const socket = io(
    process.env.REALTIME_SERVER_URL || "http://localhost:4000",
    {
      auth: { role: "task-publisher", token },
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      timeout: SOCKET_CONNECT_TIMEOUT_MS,
      transports: ["websocket"],
    },
  );

  const event: TaskCreatedEvent = {
    id: task.id,
    title: task.title,
    status: task.status,
    source: task.source,
    createdAt: task.createdAt,
  };

  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => {
        socket.timeout(SOCKET_ACK_TIMEOUT_MS).emit(
          "task:publish",
          event,
          (error: Error | null, acknowledgement: PublishAcknowledgement) => {
            if (error) {
              reject(new Error("Timed out publishing task-created event."));
              return;
            }

            if (!acknowledgement?.ok) {
              reject(
                new Error(
                  acknowledgement?.error ?? "Task-created event was rejected.",
                ),
              );
              return;
            }

            resolve();
          },
        );
      });

      socket.once("connect_error", reject);
      socket.connect();
    });
  } finally {
    socket.disconnect();
  }
}
