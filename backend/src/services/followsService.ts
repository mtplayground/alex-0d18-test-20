import type { PrismaClient } from "@prisma/client";

type FollowStore = Pick<PrismaClient, "follow" | "user">;

export type FollowResult =
  | {
      status: "following";
      followeeId: string;
    }
  | {
      status: "self-follow";
    }
  | {
      status: "followee-not-found";
    };

export type UnfollowResult =
  | {
      status: "not-following";
      followeeId: string;
    }
  | {
      status: "self-unfollow";
    }
  | {
      status: "relationship-not-found";
    };

export async function followUser({
  prisma,
  followerId,
  followeeId
}: {
  prisma: FollowStore;
  followerId: string;
  followeeId: string;
}): Promise<FollowResult> {
  if (followerId === followeeId) {
    return {
      status: "self-follow"
    };
  }

  const followee = await prisma.user.findUnique({
    where: {
      googleSub: followeeId
    },
    select: {
      googleSub: true
    }
  });

  if (!followee) {
    return {
      status: "followee-not-found"
    };
  }

  await prisma.follow.upsert({
    where: {
      followerId_followeeId: {
        followerId,
        followeeId
      }
    },
    update: {},
    create: {
      followerId,
      followeeId
    }
  });

  return {
    status: "following",
    followeeId
  };
}

export async function unfollowUser({
  prisma,
  followerId,
  followeeId
}: {
  prisma: Pick<PrismaClient, "follow">;
  followerId: string;
  followeeId: string;
}): Promise<UnfollowResult> {
  if (followerId === followeeId) {
    return {
      status: "self-unfollow"
    };
  }

  const deleted = await prisma.follow.deleteMany({
    where: {
      followerId,
      followeeId
    }
  });

  if (deleted.count === 0) {
    return {
      status: "relationship-not-found"
    };
  }

  return {
    status: "not-following",
    followeeId
  };
}
