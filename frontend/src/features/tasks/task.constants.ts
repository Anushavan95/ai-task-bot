import type { TaskFilter, TaskStatus } from "./task.types";

export const TASK_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

export const TASK_FILTER_OPTIONS: {
  value: TaskFilter;
  label: string;
}[] = [
  { value: "ALL", label: "All tasks" },
  { value: "PENDING", label: TASK_STATUS_LABELS.PENDING },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: TASK_STATUS_LABELS.COMPLETED },
];

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some((status) => status === value);
}
