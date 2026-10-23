import { isTaskStatus } from "@/features/tasks/task.constants";
import type {
  Task,
  TaskId,
  TaskSource,
  TaskStatus,
} from "@/features/tasks/task.types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskId(value: unknown): value is TaskId {
  return (
    (typeof value === "string" && value.length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function parseTaskSource(value: unknown): TaskSource | undefined {
  switch (value) {
    case "TELEGRAM":
    case "Telegram":
      return "Telegram";
    case "DASHBOARD":
    case "Dashboard":
      return "Dashboard";
    default:
      return undefined;
  }
}

export function parseTask(value: unknown): Task {
  if (!isRecord(value)) {
    throw new ApiError("The API returned an invalid task.");
  }

  const { id, title, status, createdAt } = value;
  const source = parseTaskSource(value.source);

  if (
    !isTaskId(id) ||
    typeof title !== "string" ||
    typeof status !== "string" ||
    !isTaskStatus(status) ||
    source === undefined ||
    typeof createdAt !== "string"
  ) {
    throw new ApiError("The API returned a task with invalid fields.");
  }

  return {
    id,
    title,
    status,
    source,
    createdAt,
  };
}

function parseTaskList(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    throw new ApiError("The API returned an invalid task list.");
  }

  return value.map(parseTask);
}

function getServerMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (typeof value.message === "string") {
    return value.message;
  }

  if (typeof value.error === "string") {
    return value.error;
  }

  return undefined;
}

async function request<T>(
  path: string,
  options: RequestInit,
  parse: (value: unknown) => T,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      `Could not connect to the API at ${API_BASE_URL}. Check that the backend is running.`,
      undefined,
      { cause: error },
    );
  }

  const responseText = await response.text();
  let payload: unknown;

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch (error) {
      throw new ApiError(
        `The API returned invalid JSON (HTTP ${response.status}).`,
        response.status,
        { cause: error },
      );
    }
  }

  if (response.status === 204) {
    return parse(undefined);
  }

  if (!response.ok) {
    throw new ApiError(
      getServerMessage(payload) ??
        `The API request failed with HTTP ${response.status}.`,
      response.status,
    );
  }

  if (payload === undefined) {
    throw new ApiError("The API returned an empty response.", response.status);
  }

  return parse(payload);
}

export const taskApi = {
  list(signal?: AbortSignal): Promise<Task[]> {
    return request("/tasks", { method: "GET", signal }, parseTaskList);
  },

  create(title: string): Promise<Task> {
    return request(
      "/tasks",
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
      parseTask,
    );
  },

  update(
    taskId: TaskId,
    changes: Partial<Pick<Task, "title" | "status">>,
  ): Promise<Task> {
    return request(
      `/tasks/${encodeURIComponent(String(taskId))}`,
      {
        method: "PATCH",
        body: JSON.stringify(changes),
      },
      parseTask,
    );
  },

  updateStatus(taskId: TaskId, status: TaskStatus): Promise<Task> {
    return this.update(taskId, { status });
  },

  delete(taskId: TaskId): Promise<void> {
    return request(
      `/tasks/${encodeURIComponent(String(taskId))}`,
      { method: "DELETE" },
      () => undefined,
    );
  },
};
