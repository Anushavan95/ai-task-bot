"use client";

import { useMemo, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TaskBoard } from "@/features/tasks/components/TaskBoard";
import { CreateTaskForm } from "@/features/tasks/components/CreateTaskForm";
import { StatsCards } from "@/features/tasks/components/StatsCards";
import { TaskFilters } from "@/features/tasks/components/TaskFilters";
import { TaskList } from "@/features/tasks/components/TaskList";
import type { TaskFilter, TaskView } from "@/features/tasks/task.types";
import { useTasks } from "@/features/tasks/hooks/useTasks";

export default function Home() {
  const [filter, setFilter] = useState<TaskFilter>("ALL");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<TaskView>("LIST");
  const {
    tasks,
    stats,
    isLoading,
    error,
    isRealtimeConnected,
    refreshTasks,
    createTask,
    updateTaskStatus,
    updateTaskTitle,
    deleteTask,
  } = useTasks();

  const searchFilteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return tasks.filter((task) =>
      task.title.toLowerCase().includes(normalizedSearch),
    );
  }, [search, tasks]);

  const filteredTasks = useMemo(
    () =>
      searchFilteredTasks.filter(
        (task) => filter === "ALL" || task.status === filter,
      ),
    [filter, searchFilteredTasks],
  );
  const statusCounts = useMemo(
    () => ({
      PENDING: searchFilteredTasks.filter((task) => task.status === "PENDING")
        .length,
      IN_PROGRESS: searchFilteredTasks.filter(
        (task) => task.status === "IN_PROGRESS",
      ).length,
      COMPLETED: searchFilteredTasks.filter(
        (task) => task.status === "COMPLETED",
      ).length,
    }),
    [searchFilteredTasks],
  );

  async function handleCreateTask(title: string): Promise<boolean> {
    const wasCreated = await createTask(title);

    if (wasCreated) {
      setFilter("ALL");
      setSearch("");
    }

    return wasCreated;
  }

  return (
    <main id="overview" className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <Sidebar />

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-5 flex items-center gap-2 md:hidden">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
                  T
                </span>
                <span className="font-semibold tracking-tight">TaskFlow</span>
              </div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-indigo-600">
                Workspace <span className="px-1 text-slate-300">/</span> Overview
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                My tasks
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Plan, prioritize, and track work from every channel.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700"
              >
                U
              </div>
              <div>
                <p className="text-sm font-semibold">Workspace user</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${
                      isRealtimeConnected ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  {isRealtimeConnected ? "Synced in real time" : "Connecting to live updates"}
                </p>
              </div>
            </div>
          </header>

          <StatsCards stats={stats} />
          <CreateTaskForm onCreate={handleCreateTask} />

          {error && (
            <div
              role="alert"
              className="mt-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
            >
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void refreshTasks()}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Reload tasks
              </button>
            </div>
          )}

          <section id="tasks" className="mt-8" aria-labelledby="task-list-title">
            <TaskFilters
              filter={filter}
              search={search}
              taskCount={searchFilteredTasks.length}
              statusCounts={statusCounts}
              view={view}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onViewChange={setView}
            />
            {view === "LIST" ? (
              <TaskList
                tasks={filteredTasks}
                isLoading={isLoading}
                onStatusChange={updateTaskStatus}
                onUpdate={updateTaskTitle}
                onDelete={deleteTask}
              />
            ) : (
              <TaskBoard
                tasks={filteredTasks}
                isLoading={isLoading}
                onStatusChange={updateTaskStatus}
                onUpdate={updateTaskTitle}
                onDelete={deleteTask}
              />
            )}
          </section>

          <footer className="py-8 text-center text-xs text-slate-400">
            TaskFlow · Live task updates
          </footer>
        </section>
      </div>
    </main>
  );
}
