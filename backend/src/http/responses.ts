import type { Response } from "express";
import type { z } from "zod";

export type ErrorResponseBody = {
  error: string;
  code: string;
  details?: unknown;
};

export function sendError(
  res: Response,
  status: number,
  code: string,
  error: string,
  details?: unknown
): void {
  const body: ErrorResponseBody = {
    error,
    code
  };

  if (details !== undefined) {
    body.details = details;
  }

  res.status(status).json(body);
}

export function sendValidationError(
  res: Response,
  error: z.ZodError,
  message: string
): void {
  sendError(res, 400, "VALIDATION_ERROR", message, error.flatten().fieldErrors);
}

export function sendUnauthorized(res: Response, message: string): void {
  sendError(res, 401, "UNAUTHORIZED", message);
}

export function sendNotFound(res: Response, message: string): void {
  sendError(res, 404, "NOT_FOUND", message);
}
