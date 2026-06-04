import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { serializeUser } from "./authService.js";
import {
  buildPaginatedItems,
  createPaginationQuerySchema,
  okServiceResult,
  type OkServiceResult,
  type Pagination
} from "./pagination.js";

export const DEFAULT_PROFILE_POST_LIMIT = 20;
export const MAX_PROFILE_POST_LIMIT = 50;

export const profileParamsSchema = z.object({
  userId: z.string().trim().min(1)
});

export const profileQuerySchema = createPaginationQuerySchema({
  defaultLimit: DEFAULT_PROFILE_POST_LIMIT,
  maxLimit: MAX_PROFILE_POST_LIMIT
});

type TransactionRunner = Pick<PrismaClient, "$transaction">;
type ProfileTransaction = Pick<
  Prisma.TransactionClient,
  "follow" | "post" | "user"
>;

type ProfilePostRecord = {
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
};

type ProfileUserRecord = {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    posts: number;
    following: number;
    followers: number;
  };
};

export type PublicProfilePost = ReturnType<typeof serializeProfilePost>;

export type PublicProfile = {
  user: ReturnType<typeof serializeUser>;
  stats: {
    postsCount: number;
    followingCount: number;
    followersCount: number;
    viewerIsFollowing: boolean;
  };
  posts: PublicProfilePost[];
  pagination: Pagination;
};

export type GetProfileResult =
  | OkServiceResult<PublicProfile>
  | {
      status: "user-not-found";
    };

export function serializeProfilePost(post: ProfilePostRecord) {
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

export async function getProfile({
  prisma,
  userId,
  viewerId,
  limit,
  offset
}: {
  prisma: TransactionRunner;
  userId: string;
  viewerId: string;
  limit: number;
  offset: number;
}): Promise<GetProfileResult> {
  return await prisma.$transaction(async (tx) => {
    const profileTx = tx as ProfileTransaction;
    const user = (await profileTx.user.findUnique({
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
    })) as ProfileUserRecord | null;

    if (!user) {
      return {
        status: "user-not-found"
      };
    }

    const posts = (await profileTx.post.findMany({
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
    })) as ProfilePostRecord[];
    const { pageItems, pagination } = buildPaginatedItems({
      items: posts,
      limit,
      offset
    });
    const viewerFollow = await profileTx.follow.findUnique({
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

    return okServiceResult({
      user: serializeUser(user),
      stats: {
        postsCount: user._count.posts,
        followingCount: user._count.following,
        followersCount: user._count.followers,
        viewerIsFollowing: Boolean(viewerFollow)
      },
      posts: pageItems.map(serializeProfilePost),
      pagination
    });
  });
}
