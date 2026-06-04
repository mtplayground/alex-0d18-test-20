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
import {
  createComment,
  createCommentSchema,
  listComments,
  listCommentsQuerySchema
} from "../services/commentsService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

const commentParamsSchema = z.object({
  postId: z.string().trim().min(1)
});

export const commentsRouter = Router();

commentsRouter.post(
  "/:postId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseRequest({
        schema: commentParamsSchema,
        input: req.params,
        res,
        message: "Invalid comment request"
      });

      if (!params) {
        return;
      }

      const body = parseRequest({
        schema: createCommentSchema,
        input: req.body,
        res,
        message: "Invalid comment request"
      });

      if (!body) {
        return;
      }

      const authorId = getAuthenticatedUserId(req, res);

      if (!authorId) {
        return;
      }

      const { postId } = params;
      const comment = await createComment({
        prisma: getPrismaClient(),
        postId,
        authorId,
        content: body.content
      });

      if (!comment) {
        sendNotFound(res, "Post was not found");
        return;
      }

      res.status(201).json({
        comment
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
      const params = parseRequest({
        schema: commentParamsSchema,
        input: req.params,
        res,
        message: "Invalid comment request"
      });

      if (!params) {
        return;
      }

      const query = parseRequest({
        schema: listCommentsQuerySchema,
        input: req.query,
        res,
        message: "Invalid comment request"
      });

      if (!query) {
        return;
      }

      const { postId } = params;
      const { limit, offset } = query;
      const result = await listComments({
        prisma: getPrismaClient(),
        postId,
        limit,
        offset
      });

      if (result.status === "post-not-found") {
        sendNotFound(res, "Post was not found");
        return;
      }

      res.json(result.data);
    } catch (error) {
      next(error);
    }
  }
);
