
import express from "express";
import cors from "cors";
import helmet from "helmet";
import type { ErrorRequestHandler } from "express";
import tasksRouter from "./routes/tasks.routes.js";

const app = express();
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
const configuredCorsOrigins = [
  frontendOrigin,
  ...((process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)),
].filter((origin, index, allOrigins) => allOrigins.indexOf(origin) === index);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || configuredCorsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  }),
);

app.use(express.json());

app.get("/api/started", (_req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend API is running",
  });
});

app.use("/api/tasks", tasksRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error("Unhandled request error:", error);
  res.status(500).json({ error: "Internal server error." });
};

app.use(errorHandler);

export default app;
