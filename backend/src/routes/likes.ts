import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
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
  res.status(400).json({
    error: "Invalid like request",
    details: error.flatten().fieldErrors
  });
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
        res.status(401).json({
          error: "Missing authenticated user"
        });
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
        res.status(404).json({
          error: "Post was not found"
        });
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
        res.status(401).json({
          error: "Missing authenticated user"
        });
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
        res.status(404).json({
          error: "Post was not found"
        });
        return;
      }

      res.json(likeState);
    } catch (error) {
      next(error);
    }
  }
);
