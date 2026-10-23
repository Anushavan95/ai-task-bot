"use client";

import { TASK_FILTER_OPTIONS } from "@/features/tasks/task.constants";
import type {
  TaskFilter,
  TaskStatus,
  TaskView,
} from "@/features/tasks/task.types";
import { cn } from "@/lib/utils";
import { TaskViewSwitcher } from "@/features/tasks/components/TaskViewSwitcher";

type TaskFiltersProps = {
  filter: TaskFilter;
  search: string;
  taskCount: number;
  statusCounts: Record<TaskStatus, number>;
  view: TaskView;
  onFilterChange: (filter: TaskFilter) => void;
  onSearchChange: (search: string) => void;
  onViewChange: (view: TaskView) => void;
};

export function TaskFilters({
  filter,
  search,
  taskCount,
  statusCounts,
  view,
  onFilterChange,
  onSearchChange,
  onViewChange,
}: TaskFiltersProps) {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 id="task-list-title" className="text-xl font-bold">
            Tasks
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {taskCount} {taskCount === 1 ? "task" : "tasks"} shown
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label>
            <span className="sr-only">Search tasks</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 sm:w-64"
            />
          </label>
          <TaskViewSwitcher view={view} onChange={onViewChange} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filter tasks">
        {TASK_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => onFilterChange(option.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
              filter === option.value
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {option.label}
            <span
              className={cn(
                "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none",
                filter === option.value
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {option.value === "ALL"
                ? taskCount
                : statusCounts[option.value]}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
