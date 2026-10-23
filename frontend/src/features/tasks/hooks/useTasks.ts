"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Task, TaskId, TaskStatus } from "@/features/tasks/task.types";
import { parseTask, taskApi } from "@/features/tasks/api/task.api";
import { createRealtimeConnection } from "@/lib/realtime";

function upsertTask(tasks: Task[], task: Task): Task[] {
  const existingIndex = tasks.findIndex((current) => current.id === task.id);

  if (existingIndex === -1) {
    return [task, ...tasks];
  }

  return tasks.map((current, index) =>
    index === existingIndex ? task : current,
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const refreshTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setTasks(await taskApi.list());
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "An unexpected error occurred while loading tasks.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const socket = createRealtimeConnection();

    const refreshFromApi = () => {
      void taskApi
        .list(controller.signal)
        .then((loadedTasks) => {
          setTasks((currentTasks) => {
            const loadedIds = new Set(loadedTasks.map((task) => task.id));
            const tasksReceivedWhileLoading = currentTasks.filter(
              (task) => !loadedIds.has(task.id),
            );
            return [...tasksReceivedWhileLoading, ...loadedTasks];
          });
        })
        .catch((requestError: unknown) => {
          if (!controller.signal.aborted) {
            setError(
              getErrorMessage(
                requestError,
                "An unexpected error occurred while loading tasks.",
              ),
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    };

    refreshFromApi();
    socket.on("connect", () => {
      setIsRealtimeConnected(true);
      refreshFromApi();
    });
    socket.on("disconnect", () => setIsRealtimeConnected(false));
    socket.on("connect_error", () => setIsRealtimeConnected(false));
    socket.on("task:created", (payload: unknown) => {
      try {
        setTasks((currentTasks) =>
          upsertTask(currentTasks, parseTask(payload)),
        );
      } catch (eventError) {
        console.error("Received invalid task-created realtime event:", eventError);
      }
    });
    socket.connect();

    return () => {
      controller.abort();
      socket.disconnect();
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      pending: tasks.filter((task) => task.status === "PENDING").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
    }),
    [tasks],
  );

  async function createTask(title: string): Promise<boolean> {
    setError(null);

    try {
      const createdTask = await taskApi.create(title);
      setTasks((currentTasks) => upsertTask(currentTasks, createdTask));
      return true;
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "An unexpected error occurred while creating the task.",
        ),
      );
      return false;
    }
  }

  async function updateTaskStatus(
    taskId: TaskId,
    status: TaskStatus,
  ): Promise<boolean> {
    setError(null);

    try {
      const updatedTask = await taskApi.updateStatus(taskId, status);
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      return true;
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "An unexpected error occurred while updating the task.",
        ),
      );
      return false;
    }
  }

  async function updateTaskTitle(taskId: TaskId, title: string): Promise<boolean> {
    setError(null);

    try {
      const updatedTask = await taskApi.update(taskId, { title });
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      return true;
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "An unexpected error occurred while updating the task.",
        ),
      );
      return false;
    }
  }

  async function deleteTask(taskId: TaskId): Promise<boolean> {
    setError(null);

    try {
      await taskApi.delete(taskId);
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task.id !== taskId),
      );
      return true;
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "An unexpected error occurred while deleting the task.",
        ),
      );
      return false;
    }
  }

  return {
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
  };
}
