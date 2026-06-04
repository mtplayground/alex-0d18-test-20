import type { Request, Response } from "express";
import type { z } from "zod";
import { sendUnauthorized, sendValidationError } from "../http/responses.js";
import type { PublicUser } from "../services/authService.js";

export function parseRequest<TSchema extends z.ZodTypeAny>({
  schema,
  input,
  res,
  message
}: {
  schema: TSchema;
  input: unknown;
  res: Response;
  message: string;
}): z.infer<TSchema> | null {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    sendValidationError(res, parsed.error, message);
    return null;
  }

  return parsed.data;
}

export function getAuthenticatedUserId(
  req: Request,
  res: Response
): string | null {
  const userId = req.auth?.user.googleSub;

  if (!userId) {
    sendUnauthorized(res, "Missing authenticated user");
    return null;
  }

  return userId;
}

export function getAuthenticatedUser(
  req: Request,
  res: Response
): PublicUser | null {
  const user = req.auth?.user;

  if (!user) {
    sendUnauthorized(res, "Missing authenticated user");
    return null;
  }

  return user;
}
