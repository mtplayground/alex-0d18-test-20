import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const followParamsSchema = z.object({
  followeeId: z.string().trim().min(1)
});

export const followsRouter = Router();

function getAuthenticatedUserId(req: Request): string | null {
  return req.auth?.user.googleSub ?? null;
}

async function ensureFolloweeExists(followeeId: string): Promise<boolean> {
  const followee = await getPrismaClient().user.findUnique({
    where: {
      googleSub: followeeId
    },
    select: {
      googleSub: true
    }
  });

  return Boolean(followee);
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

      if (followerId === followeeId) {
        res.status(400).json({
          error: "Cannot follow yourself"
        });
        return;
      }

      if (!(await ensureFolloweeExists(followeeId))) {
        res.status(404).json({
          error: "User to follow was not found"
        });
        return;
      }

      await getPrismaClient().follow.upsert({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId
          }
        },
        update: {},
        create: {
          followerId,
          followeeId
        }
      });

      res.json({
        following: true,
        followeeId
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

      if (followerId === followeeId) {
        res.status(400).json({
          error: "Cannot unfollow yourself"
        });
        return;
      }

      const deleted = await getPrismaClient().follow.deleteMany({
        where: {
          followerId,
          followeeId
        }
      });

      if (deleted.count === 0) {
        res.status(404).json({
          error: "Follow relationship was not found"
        });
        return;
      }

      res.json({
        following: false,
        followeeId
      });
    } catch (error) {
      next(error);
    }
  }
);
