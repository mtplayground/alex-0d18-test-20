import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUser } from "../services/authService.js";

const MAX_COMMENT_LENGTH = 1_000;
const DEFAULT_COMMENT_LIMIT = 50;
const MAX_COMMENT_LIMIT = 100;

const commentParamsSchema = z.object({
  postId: z.string().trim().min(1)
});

const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(MAX_COMMENT_LENGTH)
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

function serializeComment(comment: {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: Parameters<typeof serializeUser>[0];
}) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: serializeUser(comment.author)
  };
}

function sendInvalidCommentRequest(res: Response, error: z.ZodError) {
  res.status(400).json({
    error: "Invalid comment request",
    details: error.flatten().fieldErrors
  });
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
        res.status(401).json({
          error: "Missing authenticated user"
        });
        return;
      }

      const { postId } = parsedParams.data;
      const comment = await getPrismaClient().$transaction(async (tx) => {
        const post = await tx.post.findUnique({
          where: {
            id: postId
          },
          select: {
            id: true
          }
        });

        if (!post) {
          return null;
        }

        return await tx.comment.create({
          data: {
            postId,
            authorId,
            content: parsedBody.data.content
          },
          include: {
            author: true
          }
        });
      });

      if (!comment) {
        res.status(404).json({
          error: "Post was not found"
        });
        return;
      }

      res.status(201).json({
        comment: serializeComment(comment)
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
      const page = await getPrismaClient().$transaction(async (tx) => {
        const post = await tx.post.findUnique({
          where: {
            id: postId
          },
          select: {
            id: true
          }
        });

        if (!post) {
          return null;
        }

        const comments = await tx.comment.findMany({
          where: {
            postId
          },
          include: {
            author: true
          },
          orderBy: [
            {
              createdAt: "desc"
            },
            {
              id: "desc"
            }
          ],
          skip: offset,
          take: limit + 1
        });

        const pageItems = comments.slice(0, limit);
        const hasMore = comments.length > limit;

        return {
          comments: pageItems.map(serializeComment),
          pagination: {
            limit,
            offset,
            nextOffset: hasMore ? offset + pageItems.length : null,
            hasMore
          }
        };
      });

      if (!page) {
        res.status(404).json({
          error: "Post was not found"
        });
        return;
      }

      res.json(page);
    } catch (error) {
      next(error);
    }
  }
);
