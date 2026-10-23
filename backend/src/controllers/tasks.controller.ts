import type { RequestHandler } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { publishTaskCreated } from "../realtime/task-events.js";

const taskStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]);
const taskSourceSchema = z.enum(["TELEGRAM", "DASHBOARD"]);

const createTaskSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  source: taskSourceSchema.optional(),
});

const updateTaskSchema = createTaskSchema
  .partial()
  .refine((task) => Object.keys(task).length > 0, {
    message: "At least one task field must be provided.",
  });

function isRecordNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export const getTasks: RequestHandler = async (req, res, next) => {
  const query = z
    .object({
      status: taskStatusSchema.optional(),
    })
    .safeParse(req.query);

  if (!query.success) {
    res.status(400).json({ error: "Invalid status filter." });
    return;
  }

  try {
    const tasks = await prisma.task.findMany({
      where: query.data.status ? { status: query.data.status } : undefined,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const createTask: RequestHandler = async (req, res, next) => {
  const body = createTaskSchema.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "Invalid task data.", details: body.error.issues });
    return;
  }

  try {
    const task = await prisma.task.create({ data: body.data });
    publishTaskCreated(task);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask: RequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  const body = updateTaskSchema.safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: "Invalid task data.", details: body.error.issues });
    return;
  }

  try {
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: body.data,
    });

    res.status(200).json(task);
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      res.status(404).json({ error: "Task not found." });
      return;
    }

    next(error);
  }
};

export const deleteTask: RequestHandler<{ id: string }> = async (
  req,
  res,
  next,
) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if (isRecordNotFoundError(error)) {
      res.status(404).json({ error: "Task not found." });
      return;
    }

    next(error);
  }
};
