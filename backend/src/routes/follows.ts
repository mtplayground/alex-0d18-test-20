import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { sendError, sendNotFound } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import { followUser, unfollowUser } from "../services/followsService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

const followParamsSchema = z.object({
  followeeId: z.string().trim().min(1)
});

export const followsRouter = Router();

followsRouter.post(
  "/:followeeId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseRequest({
        schema: followParamsSchema,
        input: req.params,
        res,
        message: "Invalid follow request"
      });

      if (!params) {
        return;
      }

      const followerId = getAuthenticatedUserId(req, res);
      const { followeeId } = params;

      if (!followerId) {
        return;
      }

      const result = await followUser({
        prisma: getPrismaClient(),
        followerId,
        followeeId
      });

      if (result.status === "self-follow") {
        sendError(res, 400, "SELF_FOLLOW", "Cannot follow yourself");
        return;
      }

      if (result.status === "followee-not-found") {
        sendNotFound(res, "User to follow was not found");
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
      const params = parseRequest({
        schema: followParamsSchema,
        input: req.params,
        res,
        message: "Invalid unfollow request"
      });

      if (!params) {
        return;
      }

      const followerId = getAuthenticatedUserId(req, res);
      const { followeeId } = params;

      if (!followerId) {
        return;
      }

      const result = await unfollowUser({
        prisma: getPrismaClient(),
        followerId,
        followeeId
      });

      if (result.status === "self-unfollow") {
        sendError(res, 400, "SELF_UNFOLLOW", "Cannot unfollow yourself");
        return;
      }

      if (result.status === "relationship-not-found") {
        sendNotFound(res, "Follow relationship was not found");
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
