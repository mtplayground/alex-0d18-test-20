import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import {
  sendNotFound,
  sendUnauthorized,
  sendValidationError
} from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import {
  DEFAULT_COMMENT_LIMIT,
  MAX_COMMENT_LIMIT,
  createComment,
  createCommentSchema,
  listComments
} from "../services/commentsService.js";

const commentParamsSchema = z.object({
  postId: z.string().trim().min(1)
});

const listCommentsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_COMMENT_LIMIT)
    .default(DEFAULT_COMMENT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0)
});

export const commentsRouter = Router();

function getAuthenticatedUserId(req: Request): string | null {
  return req.auth?.user.googleSub ?? null;
}

function sendInvalidCommentRequest(res: Response, error: z.ZodError) {
  sendValidationError(res, error, "Invalid comment request");
}

commentsRouter.post(
  "/:postId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedParams = commentParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        sendInvalidCommentRequest(res, parsedParams.error);
        return;
      }

      const parsedBody = createCommentSchema.safeParse(req.body);

      if (!parsedBody.success) {
        sendInvalidCommentRequest(res, parsedBody.error);
        return;
      }

      const authorId = getAuthenticatedUserId(req);

      if (!authorId) {
        sendUnauthorized(res, "Missing authenticated user");
        return;
      }

      const { postId } = parsedParams.data;
      const comment = await createComment({
        prisma: getPrismaClient(),
        postId,
        authorId,
        content: parsedBody.data.content
      });

      if (!comment) {
        sendNotFound(res, "Post was not found");
        return;
      }

      res.status(201).json({
        comment
      });
    } catch (error) {
      next(error);
    }
  }
);

commentsRouter.get(
  "/:postId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedParams = commentParamsSchema.safeParse(req.params);

      if (!parsedParams.success) {
        sendInvalidCommentRequest(res, parsedParams.error);
        return;
      }

      const parsedQuery = listCommentsQuerySchema.safeParse(req.query);

      if (!parsedQuery.success) {
        sendInvalidCommentRequest(res, parsedQuery.error);
        return;
      }

      const { postId } = parsedParams.data;
      const { limit, offset } = parsedQuery.data;
      const page = await listComments({
        prisma: getPrismaClient(),
        postId,
        limit,
        offset
      });

      if (!page) {
        sendNotFound(res, "Post was not found");
        return;
      }

      res.json(page);
    } catch (error) {
      next(error);
    }
  }
);
