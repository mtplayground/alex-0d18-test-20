import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { feedQuerySchema, listFeedPosts } from "../services/feedService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

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
      const result = await listFeedPosts({
        prisma: getPrismaClient(),
        viewerId,
        limit,
        offset
      });

      res.json(result.data);
    } catch (error) {
      next(error);
    }
  }
);
