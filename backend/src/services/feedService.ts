import type { PrismaClient, User } from "@prisma/client";
import { serializeUser } from "./authService.js";

export const DEFAULT_FEED_LIMIT = 20;
export const MAX_FEED_LIMIT = 50;

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

export function buildPagination({
  itemCount,
  pageItemCount,
  limit,
  offset
}: {
  itemCount: number;
  pageItemCount: number;
  limit: number;
  offset: number;
}) {
  const hasMore = itemCount > limit;

  return {
    limit,
    offset,
    nextOffset: hasMore ? offset + pageItemCount : null,
    hasMore
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
}) {
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
  const pageItems = posts.slice(0, limit);

  return {
    posts: pageItems.map(serializeFeedPost),
    pagination: buildPagination({
      itemCount: posts.length,
      pageItemCount: pageItems.length,
      limit,
      offset
    })
  };
}
