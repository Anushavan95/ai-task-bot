"use client";

import { useState, type FormEvent } from "react";
import {
  isTaskStatus,
  TASK_STATUS_LABELS,
  TASK_STATUS_STYLES,
} from "@/features/tasks/task.constants";
import type { Task, TaskId, TaskStatus } from "@/features/tasks/task.types";
import { cn, formatTaskDate } from "@/lib/utils";

type TaskItemProps = {
  task: Task;
  onStatusChange: (taskId: TaskId, status: TaskStatus) => Promise<boolean>;
  onUpdate: (taskId: TaskId, title: string) => Promise<boolean>;
  onDelete: (taskId: TaskId) => Promise<boolean>;
  variant?: "list" | "board";
};

export function TaskItem({
  task,
  onStatusChange,
  onUpdate,
  onDelete,
  variant = "list",
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const titleIsValid = draftTitle.trim().length > 0 && draftTitle.trim().length <= 160;

  async function handleStatusChange(value: string) {
    if (isTaskStatus(value)) {
      setIsSaving(true);
      try {
        await onStatusChange(task.id, value);
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim();

    if (!titleIsValid || title === task.title || isSaving) {
      if (title === task.title) {
        setIsEditing(false);
      }
      return;
    }

    setIsSaving(true);
    try {
      if (await onUpdate(task.id, title)) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      if (await onDelete(task.id)) {
        setIsConfirmingDelete(false);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-4 transition sm:justify-between",
        variant === "board"
          ? "rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-200 hover:shadow-md sm:items-start"
          : "p-5 sm:flex-row sm:items-center",
      )}
    >
      <div className="min-w-0">
        {isEditing ? (
          <form onSubmit={handleUpdate} className="flex flex-col gap-2">
            <div className="min-w-0 flex-1">
              <label className="sr-only" htmlFor={`title-${task.id}`}>
                Edit task title
              </label>
              <input
                id={`title-${task.id}`}
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                maxLength={160}
                autoFocus
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <p className="mt-1 text-xs text-slate-500">
                {draftTitle.trim().length}/160 characters
              </p>
            </div>
            <div className="flex items-start gap-2">
              <button
                type="submit"
                disabled={!titleIsValid || isSaving}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setDraftTitle(task.title);
                  setIsEditing(false);
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="break-words font-medium">{task.title}</p>
            <p className="mt-2 text-xs text-slate-500">
              {task.source} · {formatTaskDate(task.createdAt)}
            </p>
          </>
        )}
      </div>

      {isConfirmingDelete ? (
        <div
          role="alertdialog"
          aria-labelledby={`delete-title-${task.id}`}
          aria-describedby={`delete-description-${task.id}`}
          className="rounded-xl border border-red-200 bg-red-50 p-3 sm:max-w-xs"
        >
          <p id={`delete-title-${task.id}`} className="text-sm font-semibold text-red-900">
            Delete this task?
          </p>
          <p id={`delete-description-${task.id}`} className="mt-1 text-xs text-red-800">
            This action can&apos;t be undone.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsConfirmingDelete(false)}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-red-100 disabled:opacity-50"
            >
              Keep task
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <div className="flex items-center gap-2">
          <span
            className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${TASK_STATUS_STYLES[task.status]}`}
          >
            {TASK_STATUS_LABELS[task.status]}
          </span>
          <span className="text-xs text-slate-400">Current status</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`status-${task.id}`}>
            Task status for {task.title}
          </label>
          <select
            id={`status-${task.id}`}
            value={task.status}
            disabled={isSaving || isEditing}
            onChange={(event) => void handleStatusChange(event.target.value)}
            title="Change task status"
            className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ring-inset outline-none transition focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 ${TASK_STATUS_STYLES[task.status]}`}
          >
            {(["PENDING", "IN_PROGRESS", "COMPLETED"] as const).map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setDraftTitle(task.title);
              setIsEditing(true);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => setIsConfirmingDelete(true)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
