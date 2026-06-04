import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import {
  DEFAULT_FEED_LIMIT,
  MAX_FEED_LIMIT,
  listFeedPosts
} from "../services/feedService.js";

const feedQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_FEED_LIMIT)
    .default(DEFAULT_FEED_LIMIT),
  offset: z.coerce.number().int().min(0).default(0)
});

export const feedRouter = Router();

feedRouter.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = feedQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid feed request",
          details: parsed.error.flatten().fieldErrors
        });
        return;
      }

      const viewerId = req.auth?.user.googleSub;

      if (!viewerId) {
        res.status(401).json({
          error: "Missing authenticated user"
        });
        return;
      }

      const { limit, offset } = parsed.data;
      const page = await listFeedPosts({
        prisma: getPrismaClient(),
        viewerId,
        limit,
        offset
      });

      res.json(page);
    } catch (error) {
      next(error);
    }
  }
);
