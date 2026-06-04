import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { z } from "zod";
import { getPrismaClient } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { serializeUser } from "../services/authService.js";

const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;

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

function serializeFeedPost(post: {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: Parameters<typeof serializeUser>[0];
  likes: Array<{ id: string }>;
  _count: {
    likes: number;
    comments: number;
  };
}) {
  return {
    id: post.id,
    authorId: post.authorId,
    imageUrl: post.imageUrl,
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: serializeUser(post.author),
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    viewerHasLiked: post.likes.length > 0
  };
}

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
      const posts = await getPrismaClient().post.findMany({
        where: {
          author: {
            followers: {
              some: {
                followerId: viewerId
              }
            }
          }
        },
        include: {
          author: true,
          likes: {
            where: {
              userId: viewerId
            },
            select: {
              id: true
            },
            take: 1
          },
          _count: {
            select: {
              likes: true,
              comments: true
            }
          }
        },
        orderBy: [
          {
            createdAt: "desc"
          },
          {
            id: "desc"
          }
        ],
        skip: offset,
        take: limit + 1
      });

      const pageItems = posts.slice(0, limit);
      const hasMore = posts.length > limit;

      res.json({
        posts: pageItems.map(serializeFeedPost),
        pagination: {
          limit,
          offset,
          nextOffset: hasMore ? offset + pageItems.length : null,
          hasMore
        }
      });
    } catch (error) {
      next(error);
    }
  }
);
