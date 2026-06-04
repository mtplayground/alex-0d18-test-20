import type { Prisma, PrismaClient, User } from "@prisma/client";
import { z } from "zod";
import { serializeUser } from "./authService.js";
import {
  buildPaginatedItems,
  createPaginationQuerySchema,
  okServiceResult,
  type OkServiceResult,
  type Pagination
} from "./pagination.js";

export const MAX_COMMENT_LENGTH = 1_000;
export const DEFAULT_COMMENT_LIMIT = 50;
export const MAX_COMMENT_LIMIT = 100;
export const listCommentsQuerySchema = createPaginationQuerySchema({
  defaultLimit: DEFAULT_COMMENT_LIMIT,
  maxLimit: MAX_COMMENT_LIMIT
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(MAX_COMMENT_LENGTH)
});

type TransactionRunner = Pick<PrismaClient, "$transaction">;
type CommentTransaction = Pick<Prisma.TransactionClient, "comment" | "post">;

type CommentRecord = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: User;
};

export type CommentsPage = {
  comments: ReturnType<typeof serializeComment>[];
  pagination: Pagination;
};

export type ListCommentsResult =
  | OkServiceResult<CommentsPage>
  | {
      status: "post-not-found";
    };

export function serializeComment(comment: CommentRecord) {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: serializeUser(comment.author)
  };
}

export async function createComment({
  prisma,
  postId,
  authorId,
  content
}: {
  prisma: TransactionRunner;
  postId: string;
  authorId: string;
  content: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: {
        id: postId
      },
      select: {
        id: true
      }
    });

    if (!post) {
      return null;
    }

    const comment = await (tx as CommentTransaction).comment.create({
      data: {
        postId,
        authorId,
        content
      },
      include: {
        author: true
      }
    });

    return serializeComment(comment);
  });
}

export async function listComments({
  prisma,
  postId,
  limit,
  offset
}: {
  prisma: TransactionRunner;
  postId: string;
  limit: number;
  offset: number;
}): Promise<ListCommentsResult> {
  return await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: {
        id: postId
      },
      select: {
        id: true
      }
    });

    if (!post) {
      return {
        status: "post-not-found"
      };
    }

    const comments = await (tx as CommentTransaction).comment.findMany({
      where: {
        postId
      },
      include: {
        author: true
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
      items: comments,
      limit,
      offset
    });

    return okServiceResult({
      comments: pageItems.map(serializeComment),
      pagination
    });
  });
}
