import type { Server } from "socket.io";
import type { Task } from "../../generated/prisma/client.js";

export type TaskCreatedEvent = Pick<
  Task,
  "id" | "title" | "status" | "source" | "createdAt"
>;

let realtimeServer: Server | undefined;

export function setRealtimeServer(server: Server): void {
  realtimeServer = server;
}

export function publishTaskCreated(task: Task): void {
  const event: TaskCreatedEvent = {
    id: task.id,
    title: task.title,
    status: task.status,
    source: task.source,
    createdAt: task.createdAt,
  };

  realtimeServer?.emit("task:created", event);
}
