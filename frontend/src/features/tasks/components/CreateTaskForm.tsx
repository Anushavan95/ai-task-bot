"use client";

import { useState, type FormEvent } from "react";

type CreateTaskFormProps = {
  onCreate: (title: string) => Promise<boolean>;
};

export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasCreated, setWasCreated] = useState(false);
  const trimmedTitle = title.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedTitle || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setWasCreated(false);

    try {
      if (await onCreate(trimmedTitle)) {
        setTitle("");
        setWasCreated(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-7 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-3 bg-gradient-to-r from-indigo-50/90 via-white to-white px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl font-medium text-white shadow-sm shadow-indigo-200"
          >
            +
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Quick add</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Capture a task now; organize it whenever you&apos;re ready.
            </p>
          </div>
        </div>
        <p className="hidden text-xs font-medium text-slate-400 sm:block">
          Also works with your Telegram bot
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-start sm:px-6"
      >
        <label className="sr-only" htmlFor="new-task-title">
          New task title
        </label>
        <input
          id="new-task-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setWasCreated(false);
          }}
          placeholder="What needs to be done?"
          maxLength={160}
          aria-describedby="new-task-hint"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
        />
        <button
          type="submit"
          disabled={!trimmedTitle || isSubmitting}
          className="min-h-12 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add task"}
        </button>
        <p id="new-task-hint" className="sr-only">
          Enter a task title of up to 160 characters.
        </p>
      </form>
      {wasCreated && (
        <p role="status" className="px-6 pb-4 text-sm font-medium text-emerald-700">
          Task added to your list.
        </p>
      )}
    </section>
  );
}
