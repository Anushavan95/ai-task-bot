import type { TaskView } from "@/features/tasks/task.types";
import { cn } from "@/lib/utils";

type TaskViewSwitcherProps = {
  view: TaskView;
  onChange: (view: TaskView) => void;
};

const views: { value: TaskView; label: string; icon: string }[] = [
  { value: "LIST", label: "List", icon: "☰" },
  { value: "BOARD", label: "Board", icon: "▦" },
];

export function TaskViewSwitcher({ view, onChange }: TaskViewSwitcherProps) {
  return (
    <div
      role="group"
      aria-label="Task view"
      className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1"
    >
      {views.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={view === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
            view === option.value
              ? "bg-indigo-50 text-indigo-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
          )}
        >
          <span aria-hidden="true">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
