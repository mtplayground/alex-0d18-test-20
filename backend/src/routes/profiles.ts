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
import { serializeUser } from "../services/authService.js";
import { getAuthenticatedUserId, parseRequest } from "./helpers.js";

const DEFAULT_PROFILE_POST_LIMIT = 20;
const MAX_PROFILE_POST_LIMIT = 50;

const profileParamsSchema = z.object({
  userId: z.string().trim().min(1)
});

const profileQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PROFILE_POST_LIMIT)
    .default(DEFAULT_PROFILE_POST_LIMIT),
  offset: z.coerce.number().int().min(0).default(0)
});

export const profilesRouter = Router();

function serializeProfilePost(post: {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
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
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    viewerHasLiked: post.likes.length > 0
  };
}

profilesRouter.get(
  "/:userId",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = parseRequest({
        schema: profileParamsSchema,
        input: req.params,
        res,
        message: "Invalid profile request"
      });

      if (!params) {
        return;
      }

      const query = parseRequest({
        schema: profileQuerySchema,
        input: req.query,
        res,
        message: "Invalid profile request"
      });

      if (!query) {
        return;
      }

      const viewerId = getAuthenticatedUserId(req, res);

      if (!viewerId) {
        return;
      }

      const { userId } = params;
      const { limit, offset } = query;
      const profile = await getPrismaClient().$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: {
            googleSub: userId
          },
          include: {
            _count: {
              select: {
                posts: true,
                following: true,
                followers: true
              }
            }
          }
        });

        if (!user) {
          return null;
        }

        const posts = await tx.post.findMany({
          where: {
            authorId: userId
          },
          include: {
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
        const viewerFollow = await tx.follow.findUnique({
          where: {
            followerId_followeeId: {
              followerId: viewerId,
              followeeId: userId
            }
          },
          select: {
            followerId: true
          }
        });

        return {
          user: serializeUser(user),
          stats: {
            postsCount: user._count.posts,
            followingCount: user._count.following,
            followersCount: user._count.followers,
            viewerIsFollowing: Boolean(viewerFollow)
          },
          posts: pageItems.map(serializeProfilePost),
          pagination: {
            limit,
            offset,
            nextOffset: hasMore ? offset + pageItems.length : null,
            hasMore
          }
        };
      });

      if (!profile) {
        sendNotFound(res, "User was not found");
        return;
      }

      res.json({
        profile
      });
    } catch (error) {
      next(error);
    }
  }
);
