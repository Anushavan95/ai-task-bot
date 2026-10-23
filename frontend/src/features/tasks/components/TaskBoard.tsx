import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/features/tasks/task.constants";
import type { Task, TaskId, TaskStatus } from "@/features/tasks/task.types";
import { TaskItem } from "@/features/tasks/components/TaskItem";

type TaskBoardProps = {
  tasks: Task[];
  isLoading: boolean;
  onStatusChange: (taskId: TaskId, status: TaskStatus) => Promise<boolean>;
  onUpdate: (taskId: TaskId, title: string) => Promise<boolean>;
  onDelete: (taskId: TaskId) => Promise<boolean>;
};

const statusAccent: Record<TaskStatus, string> = {
  PENDING: "bg-amber-400",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-emerald-500",
};

export function TaskBoard({
  tasks,
  isLoading,
  onStatusChange,
  onUpdate,
  onDelete,
}: TaskBoardProps) {
  return (
    <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);

        return (
          <section
            key={status}
            aria-labelledby={`column-${status}`}
            className="min-w-0 rounded-2xl bg-slate-100/80 p-3 sm:p-4"
          >
            <header className="mb-4 flex items-center justify-between px-1">
              <h3
                id={`column-${status}`}
                className="flex items-center gap-2 text-sm font-semibold text-slate-800"
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${statusAccent[status]}`}
                />
                {TASK_STATUS_LABELS[status]}
              </h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                {isLoading ? "—" : columnTasks.length}
              </span>
            </header>

            {isLoading ? (
              <div className="space-y-3" role="status" aria-label="Loading tasks">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            ) : columnTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-xs text-slate-500">
                No {TASK_STATUS_LABELS[status].toLowerCase()} tasks
              </p>
            ) : (
              <ul className="space-y-3">
                {columnTasks.map((task) => (
                  <li key={task.id}>
                    <TaskItem
                      task={task}
                      variant="board"
                      onStatusChange={onStatusChange}
                      onUpdate={onUpdate}
                      onDelete={onDelete}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
