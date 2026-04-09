import type { ErrorHandler } from "hono";
import { AppError } from "../shared/errors/index.js";
import { logger } from "../config/logger.js";

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof AppError) {
    logger.warn({ code: err.code, message: err.message, status: err.statusCode }, "App error");
    return c.json(
      { error: { code: err.code, message: err.message, details: err.details } },
      err.statusCode as any
    );
  }

  logger.error({ err }, "Unhandled error");
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    500
  );
};
