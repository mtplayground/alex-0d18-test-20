import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { getS3Env } from "../config/env.js";
import { getPrismaClient } from "../db/prisma.js";
import { sendError } from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import { createPost, createPostSchema } from "../services/postsService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

export const postsRouter = Router();

postsRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = parseRequest({
        schema: createPostSchema,
        input: req.body,
        res,
        message: "Invalid post request"
      });

      if (!body) {
        return;
      }

      const authorId = getAuthenticatedUserId(req, res);

      if (!authorId) {
        return;
      }

      const result = await createPost({
        prisma: getPrismaClient(),
        authorId,
        imageUrl: body.imageUrl,
        caption: body.caption,
        s3Env: getS3Env()
      });

      if (result.status === "invalid-image-url") {
        sendError(
          res,
          400,
          "INVALID_IMAGE_URL",
          "Image URL must reference an uploaded object"
        );
        return;
      }

      res.status(201).json({
        post: result.post
      });
    } catch (error) {
      next(error);
    }
  }
);
