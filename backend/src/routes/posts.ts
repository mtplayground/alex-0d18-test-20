import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getS3Env } from "../config/env.js";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const MAX_CAPTION_LENGTH = 2_200;

const createPostSchema = z.object({
  imageUrl: z.string().url(),
  caption: z
    .string()
    .trim()
    .max(MAX_CAPTION_LENGTH)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))
});

export const postsRouter = Router();

function getAllowedImageUrlPrefix(): string {
  const env = getS3Env();
  const publicBaseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${publicBaseUrl}/${env.S3_PREFIX}`;
}

function serializePost(post: {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: post.id,
    authorId: post.authorId,
    imageUrl: post.imageUrl,
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString()
  };
}

postsRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createPostSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid post request",
          details: parsed.error.flatten().fieldErrors
        });
        return;
      }

      const authorId = req.auth?.user.googleSub;

      if (!authorId) {
        res.status(401).json({
          error: "Missing authenticated user"
        });
        return;
      }

      if (!parsed.data.imageUrl.startsWith(getAllowedImageUrlPrefix())) {
        res.status(400).json({
          error: "Image URL must reference an uploaded object"
        });
        return;
      }

      const post = await getPrismaClient().post.create({
        data: {
          authorId,
          imageUrl: parsed.data.imageUrl,
          caption: parsed.data.caption
        }
      });

      res.status(201).json({
        post: serializePost(post)
      });
    } catch (error) {
      next(error);
    }
  }
);
