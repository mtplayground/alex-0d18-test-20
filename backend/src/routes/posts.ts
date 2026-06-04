import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { getS3Env } from "../config/env.js";
import { getPrismaClient } from "../db/prisma.js";
import {
  sendError,
  sendUnauthorized,
  sendValidationError
} from "../http/responses.js";
import { requireAuth } from "../middleware/auth.js";
import { createPost, createPostSchema } from "../services/postsService.js";

export const postsRouter = Router();

postsRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createPostSchema.safeParse(req.body);

      if (!parsed.success) {
        sendValidationError(res, parsed.error, "Invalid post request");
        return;
      }

      const authorId = req.auth?.user.googleSub;

      if (!authorId) {
        sendUnauthorized(res, "Missing authenticated user");
        return;
      }

      const result = await createPost({
        prisma: getPrismaClient(),
        authorId,
        imageUrl: parsed.data.imageUrl,
        caption: parsed.data.caption,
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
