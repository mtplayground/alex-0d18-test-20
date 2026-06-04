import type { PrismaClient, User } from "@prisma/client";
import { serializeUser } from "./authService.js";
import {
  buildPaginatedItems,
  createPaginationQuerySchema,
  okServiceResult,
  type OkServiceResult,
  type Pagination
} from "./pagination.js";

export const DEFAULT_FEED_LIMIT = 20;
export const MAX_FEED_LIMIT = 50;
export const feedQuerySchema = createPaginationQuerySchema({
  defaultLimit: DEFAULT_FEED_LIMIT,
  maxLimit: MAX_FEED_LIMIT
});

type FeedPostRecord = {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: User;
  likes: Array<{ id: string }>;
  _count: {
    likes: number;
    comments: number;
  };
};

export type FeedPage = {
  posts: ReturnType<typeof serializeFeedPost>[];
  pagination: Pagination;
};

export function serializeFeedPost(post: FeedPostRecord) {
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

export async function listFeedPosts({
  prisma,
  viewerId,
  limit,
  offset
}: {
  prisma: Pick<PrismaClient, "post">;
  viewerId: string;
  limit: number;
  offset: number;
}): Promise<OkServiceResult<FeedPage>> {
  const posts = await prisma.post.findMany({
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
  const { pageItems, pagination } = buildPaginatedItems({
    items: posts,
    limit,
    offset
  });

  return okServiceResult({
    posts: pageItems.map(serializeFeedPost),
    pagination
  });
}
