import type { Prisma, PrismaClient } from "@prisma/client";

export type LikeResponse = {
  liked: boolean;
  postId: string;
  likesCount: number;
};

type TransactionRunner = Pick<PrismaClient, "$transaction">;
type LikeTransaction = Pick<Prisma.TransactionClient, "like" | "post">;

async function updatePostLikeInTransaction({
  tx,
  userId,
  postId,
  liked
}: {
  tx: LikeTransaction;
  userId: string;
  postId: string;
  liked: boolean;
}): Promise<LikeResponse | null> {
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

  if (liked) {
    await tx.like.upsert({
      where: {
        userId_postId: {
          userId,
          postId
        }
      },
      update: {},
      create: {
        userId,
        postId
      }
    });
  } else {
    await tx.like.deleteMany({
      where: {
        userId,
        postId
      }
    });
  }

  const likesCount = await tx.like.count({
    where: {
      postId
    }
  });

  return {
    liked,
    postId,
    likesCount
  };
}

export async function updatePostLike({
  prisma,
  userId,
  postId,
  liked
}: {
  prisma: TransactionRunner;
  userId: string;
  postId: string;
  liked: boolean;
}): Promise<LikeResponse | null> {
  return await prisma.$transaction(async (tx) =>
    updatePostLikeInTransaction({
      tx,
      userId,
      postId,
      liked
    })
  );
}
