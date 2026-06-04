import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { followUser, unfollowUser } from "../services/followsService.js";

const followParamsSchema = z.object({
  followeeId: z.string().trim().min(1)
});

export const followsRouter = Router();

function getAuthenticatedUserId(req: Request): string | null {
  return req.auth?.user.googleSub ?? null;
}

followsRouter.post(
  "/:followeeId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = followParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid follow request",
          details: parsed.error.flatten().fieldErrors
        });
        return;
      }

      const followerId = getAuthenticatedUserId(req);
      const { followeeId } = parsed.data;

      if (!followerId) {
        res.status(401).json({
          error: "Missing authenticated user"
        });
        return;
      }

      const result = await followUser({
        prisma: getPrismaClient(),
        followerId,
        followeeId
      });

      if (result.status === "self-follow") {
        res.status(400).json({
          error: "Cannot follow yourself"
        });
        return;
      }

      if (result.status === "followee-not-found") {
        res.status(404).json({
          error: "User to follow was not found"
        });
        return;
      }

      res.json({
        following: true,
        followeeId: result.followeeId
      });
    } catch (error) {
      next(error);
    }
  }
);

followsRouter.delete(
  "/:followeeId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = followParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid unfollow request",
          details: parsed.error.flatten().fieldErrors
        });
        return;
      }

      const followerId = getAuthenticatedUserId(req);
      const { followeeId } = parsed.data;

      if (!followerId) {
        res.status(401).json({
          error: "Missing authenticated user"
        });
        return;
      }

      const result = await unfollowUser({
        prisma: getPrismaClient(),
        followerId,
        followeeId
      });

      if (result.status === "self-unfollow") {
        res.status(400).json({
          error: "Cannot unfollow yourself"
        });
        return;
      }

      if (result.status === "relationship-not-found") {
        res.status(404).json({
          error: "Follow relationship was not found"
        });
        return;
      }

      res.json({
        following: false,
        followeeId: result.followeeId
      });
    } catch (error) {
      next(error);
    }
  }
);
