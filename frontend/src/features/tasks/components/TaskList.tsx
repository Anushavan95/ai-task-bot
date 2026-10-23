import type { Task, TaskId, TaskStatus } from "@/features/tasks/task.types";
import { TaskItem } from "@/features/tasks/components/TaskItem";

type TaskListProps = {
  tasks: Task[];
  isLoading: boolean;
  onStatusChange: (taskId: TaskId, status: TaskStatus) => Promise<boolean>;
  onUpdate: (taskId: TaskId, title: string) => Promise<boolean>;
  onDelete: (taskId: TaskId) => Promise<boolean>;
};

export function TaskList({
  tasks,
  isLoading,
  onStatusChange,
  onUpdate,
  onDelete,
}: TaskListProps) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {isLoading ? (
        <div role="status" aria-label="Loading tasks" className="space-y-px">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex animate-pulse items-center gap-4 border-b border-slate-100 p-5 last:border-b-0"
            >
              <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-2/3 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-1/3 rounded bg-slate-100" />
              </div>
              <div className="hidden h-9 w-24 rounded-lg bg-slate-100 sm:block" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-10 text-center sm:p-14">
          <span
            aria-hidden="true"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600"
          >
            ✓
          </span>
          <p className="mt-4 font-semibold">You&apos;re all caught up</p>
          <p className="mt-1 text-sm text-slate-500">
            Try another filter or create a new task.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskItem
                task={task}
                onStatusChange={onStatusChange}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
