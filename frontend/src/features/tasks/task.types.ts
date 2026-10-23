export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export type TaskSource = "Telegram" | "Dashboard";
export type TaskId = number | string;

export type Task = {
  id: TaskId;
  title: string;
  status: TaskStatus;
  source: TaskSource;
  createdAt: string;
};

export type TaskFilter = "ALL" | TaskStatus;
export type TaskView = "LIST" | "BOARD";
