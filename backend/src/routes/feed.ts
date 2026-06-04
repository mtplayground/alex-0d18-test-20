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
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

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
      const query = parseRequest({
        schema: feedQuerySchema,
        input: req.query,
        res,
        message: "Invalid feed request"
      });

      if (!query) {
        return;
      }

      const viewerId = getAuthenticatedUserId(req, res);

      if (!viewerId) {
        return;
      }

      const { limit, offset } = query;
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
