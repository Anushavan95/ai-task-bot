
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

// Add security-related HTTP headers.
app.use(helmet());

// Allow requests from the browser-based frontend and configured Docker origins.
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

// Parse incoming JSON request bodies.
app.use(express.json());

// Health-check endpoint.
app.get("/api/health", (_req, res) => {
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
