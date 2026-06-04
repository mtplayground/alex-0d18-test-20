import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { sendNotFound } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import { updatePostLike } from "../services/likesService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

const likeParamsSchema = z.object({
  postId: z.string().trim().min(1)
});

export const likesRouter = Router();

likesRouter.post(
  "/:postId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseRequest({
        schema: likeParamsSchema,
        input: req.params,
        res,
        message: "Invalid like request"
      });

      if (!params) {
        return;
      }

      const userId = getAuthenticatedUserId(req, res);

      if (!userId) {
        return;
      }

      const { postId } = params;
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
      const params = parseRequest({
        schema: likeParamsSchema,
        input: req.params,
        res,
        message: "Invalid like request"
      });

      if (!params) {
        return;
      }

      const userId = getAuthenticatedUserId(req, res);

      if (!userId) {
        return;
      }

      const { postId } = params;
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
