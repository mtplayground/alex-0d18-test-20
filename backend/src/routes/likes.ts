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
import { updatePostLike } from "../services/likesService.js";

const likeParamsSchema = z.object({
  postId: z.string().trim().min(1)
});

export const likesRouter = Router();

function getAuthenticatedUserId(req: Request): string | null {
  return req.auth?.user.googleSub ?? null;
}

function sendInvalidLikeRequest(res: Response, error: z.ZodError) {
  sendValidationError(res, error, "Invalid like request");
}

likesRouter.post(
  "/:postId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = likeParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        sendInvalidLikeRequest(res, parsed.error);
        return;
      }

      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        sendUnauthorized(res, "Missing authenticated user");
        return;
      }

      const { postId } = parsed.data;
      const likeState = await updatePostLike({
        prisma: getPrismaClient(),
        userId,
        postId,
        liked: true
      });

      if (!likeState) {
        sendNotFound(res, "Post was not found");
        return;
      }

      res.json(likeState);
    } catch (error) {
      next(error);
    }
  }
);

likesRouter.delete(
  "/:postId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = likeParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        sendInvalidLikeRequest(res, parsed.error);
        return;
      }

      const userId = getAuthenticatedUserId(req);

      if (!userId) {
        sendUnauthorized(res, "Missing authenticated user");
        return;
      }

      const { postId } = parsed.data;
      const likeState = await updatePostLike({
        prisma: getPrismaClient(),
        userId,
        postId,
        liked: false
      });

      if (!likeState) {
        sendNotFound(res, "Post was not found");
        return;
      }

      res.json(likeState);
    } catch (error) {
      next(error);
    }
  }
);
