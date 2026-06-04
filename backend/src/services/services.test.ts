import assert from "node:assert/strict";
import test from "node:test";
import type { User } from "@prisma/client";
import type { S3Env } from "../config/env.js";
import {
  buildUserUpsertArgsFromClaims,
  serializeUser,
  type VerifiedAuthClaims
} from "./authService.js";
import { createComment, listComments } from "./commentsService.js";
import { followUser, unfollowUser } from "./followsService.js";
import { listFeedPosts } from "./feedService.js";
import { updatePostLike } from "./likesService.js";
import { createPost } from "./postsService.js";
import { getProfile } from "./profilesService.js";

type FirstArg<TFunction> = TFunction extends (arg: infer TArg) => unknown
  ? TArg
  : never;

const createdAt = new Date("2026-06-04T10:00:00.000Z");
const updatedAt = new Date("2026-06-04T10:05:00.000Z");

function makeUser(overrides: Partial<User> = {}): User {
  return {
    googleSub: "user-1",
    email: "user@example.com",
    name: "User One",
    avatarUrl: "https://example.com/avatar.jpg",
    createdAt,
    updatedAt,
    ...overrides
  };
}

function makeS3Env(overrides: Partial<S3Env> = {}): S3Env {
  return {
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
    S3_BUCKET: "bucket",
    S3_PREFIX: "app_alex_0d18_test_20_abc966/",
    S3_ENDPOINT: "https://fly.storage.tigris.dev",
    S3_REGION: "auto",
    S3_FORCE_PATH_STYLE: true,
    S3_PUBLIC_BASE_URL: "https://public.example.com",
    ...overrides
  };
}

test("auth service maps claims into user upsert data and public user shape", () => {
  const claims: VerifiedAuthClaims = {
    sub: "google-123",
    email: "person@example.com",
    name: "Person",
    picture: "https://example.com/person.jpg"
  };

  assert.deepEqual(buildUserUpsertArgsFromClaims(claims), {
    where: {
      googleSub: "google-123"
    },
    update: {
      email: "person@example.com",
      name: "Person",
      avatarUrl: "https://example.com/person.jpg"
    },
    create: {
      googleSub: "google-123",
      email: "person@example.com",
      name: "Person",
      avatarUrl: "https://example.com/person.jpg"
    }
  });

  assert.deepEqual(
    serializeUser(
      makeUser({
        googleSub: "google-123",
        email: "person@example.com",
        name: "Person",
        avatarUrl: "https://example.com/person.jpg"
      })
    ),
    {
      googleSub: "google-123",
      email: "person@example.com",
      name: "Person",
      avatarUrl: "https://example.com/person.jpg"
    }
  );
});

test("post service rejects non-storage image URLs before creating a post", async () => {
  const createCalls: unknown[] = [];
  const prisma = {
    post: {
      create: async (args: unknown) => {
        createCalls.push(args);
        return {
          id: "post-1",
          authorId: "author-1",
          imageUrl:
            "https://public.example.com/app_alex_0d18_test_20_abc966/posts/a.jpg",
          caption: "Caption",
          createdAt,
          updatedAt
        };
      }
    }
  } as unknown as FirstArg<typeof createPost>["prisma"];

  const rejected = await createPost({
    prisma,
    authorId: "author-1",
    imageUrl: "https://public.example.com/outside/a.jpg",
    caption: "Caption",
    s3Env: makeS3Env()
  });

  assert.deepEqual(rejected, {
    status: "invalid-image-url"
  });
  assert.equal(createCalls.length, 0);
});

test("post service creates and serializes posts for prefixed object URLs", async () => {
  const createCalls: unknown[] = [];
  const imageUrl =
    "https://public.example.com/app_alex_0d18_test_20_abc966/posts/a.jpg";
  const prisma = {
    post: {
      create: async (args: unknown) => {
        createCalls.push(args);
        return {
          id: "post-1",
          authorId: "author-1",
          imageUrl,
          caption: "Caption",
          createdAt,
          updatedAt
        };
      }
    }
  } as unknown as FirstArg<typeof createPost>["prisma"];

  const created = await createPost({
    prisma,
    authorId: "author-1",
    imageUrl,
    caption: "Caption",
    s3Env: makeS3Env()
  });

  assert.equal(created.status, "created");
  assert.deepEqual(createCalls[0], {
    data: {
      authorId: "author-1",
      imageUrl,
      caption: "Caption"
    }
  });

  if (created.status === "created") {
    assert.deepEqual(created.post, {
      id: "post-1",
      authorId: "author-1",
      imageUrl,
      caption: "Caption",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });
  }
});

test("follow service prevents self-follow and upserts valid follows", async () => {
  const upsertCalls: unknown[] = [];
  const prisma = {
    user: {
      findUnique: async () => ({
        googleSub: "followee-1"
      })
    },
    follow: {
      upsert: async (args: unknown) => {
        upsertCalls.push(args);
        return {};
      }
    }
  } as unknown as FirstArg<typeof followUser>["prisma"];

  assert.deepEqual(
    await followUser({
      prisma,
      followerId: "user-1",
      followeeId: "user-1"
    }),
    {
      status: "self-follow"
    }
  );

  assert.deepEqual(
    await followUser({
      prisma,
      followerId: "user-1",
      followeeId: "followee-1"
    }),
    {
      status: "following",
      followeeId: "followee-1"
    }
  );
  assert.deepEqual(upsertCalls[0], {
    where: {
      followerId_followeeId: {
        followerId: "user-1",
        followeeId: "followee-1"
      }
    },
    update: {},
    create: {
      followerId: "user-1",
      followeeId: "followee-1"
    }
  });
});

test("unfollow service reports missing and deleted relationships", async () => {
  const deleteCalls: unknown[] = [];
  const prisma = {
    follow: {
      deleteMany: async (args: unknown) => {
        deleteCalls.push(args);
        return {
          count: deleteCalls.length === 1 ? 0 : 1
        };
      }
    }
  } as unknown as FirstArg<typeof unfollowUser>["prisma"];

  assert.deepEqual(
    await unfollowUser({
      prisma,
      followerId: "user-1",
      followeeId: "followee-1"
    }),
    {
      status: "relationship-not-found"
    }
  );
  assert.deepEqual(
    await unfollowUser({
      prisma,
      followerId: "user-1",
      followeeId: "followee-1"
    }),
    {
      status: "not-following",
      followeeId: "followee-1"
    }
  );
});

test("feed service queries followed users and paginates newest posts", async () => {
  const findManyCalls: unknown[] = [];
  const prisma = {
    post: {
      findMany: async (args: unknown) => {
        findManyCalls.push(args);
        return [
          {
            id: "post-2",
            authorId: "author-2",
            imageUrl: "https://example.com/2.jpg",
            caption: null,
            createdAt,
            updatedAt,
            author: makeUser({ googleSub: "author-2" }),
            likes: [{ id: "like-1" }],
            _count: {
              likes: 3,
              comments: 4
            }
          },
          {
            id: "post-1",
            authorId: "author-1",
            imageUrl: "https://example.com/1.jpg",
            caption: "Older",
            createdAt,
            updatedAt,
            author: makeUser({ googleSub: "author-1" }),
            likes: [],
            _count: {
              likes: 1,
              comments: 0
            }
          }
        ];
      }
    }
  } as unknown as FirstArg<typeof listFeedPosts>["prisma"];

  const result = await listFeedPosts({
    prisma,
    viewerId: "viewer-1",
    limit: 1,
    offset: 5
  });

  assert.deepEqual(findManyCalls[0], {
    where: {
      author: {
        followers: {
          some: {
            followerId: "viewer-1"
          }
        }
      }
    },
    include: {
      author: true,
      likes: {
        where: {
          userId: "viewer-1"
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
    skip: 5,
    take: 2
  });
  assert.equal(result.status, "ok");

  if (result.status === "ok") {
    assert.equal(result.data.posts.length, 1);
    assert.equal(result.data.posts[0]?.viewerHasLiked, true);
    assert.deepEqual(result.data.pagination, {
      limit: 1,
      offset: 5,
      nextOffset: 6,
      hasMore: true
    });
  }
});

test("like service upserts, deletes, counts, and handles missing posts", async () => {
  const likeCalls: string[] = [];
  const tx = {
    post: {
      findUnique: async () => ({
        id: "post-1"
      })
    },
    like: {
      upsert: async () => {
        likeCalls.push("upsert");
        return {};
      },
      deleteMany: async () => {
        likeCalls.push("deleteMany");
        return {
          count: 1
        };
      },
      count: async () => 7
    }
  };
  const prisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>
    ) => await callback(tx)
  } as unknown as FirstArg<typeof updatePostLike>["prisma"];

  assert.deepEqual(
    await updatePostLike({
      prisma,
      userId: "user-1",
      postId: "post-1",
      liked: true
    }),
    {
      liked: true,
      postId: "post-1",
      likesCount: 7
    }
  );
  assert.deepEqual(
    await updatePostLike({
      prisma,
      userId: "user-1",
      postId: "post-1",
      liked: false
    }),
    {
      liked: false,
      postId: "post-1",
      likesCount: 7
    }
  );
  assert.deepEqual(likeCalls, ["upsert", "deleteMany"]);

  const missingTx = {
    post: {
      findUnique: async () => null
    },
    like: tx.like
  };
  const missingPrisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof missingTx) => Promise<TResult>
    ) => await callback(missingTx)
  } as unknown as FirstArg<typeof updatePostLike>["prisma"];

  assert.equal(
    await updatePostLike({
      prisma: missingPrisma,
      userId: "user-1",
      postId: "missing",
      liked: true
    }),
    null
  );
});

test("comment service creates comments only for existing posts", async () => {
  const createdComment = {
    id: "comment-1",
    postId: "post-1",
    authorId: "user-1",
    content: "Nice",
    createdAt,
    updatedAt,
    author: makeUser({ googleSub: "user-1" })
  };
  const tx = {
    post: {
      findUnique: async () => ({
        id: "post-1"
      })
    },
    comment: {
      create: async () => createdComment
    }
  };
  const prisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>
    ) => await callback(tx)
  } as unknown as FirstArg<typeof createComment>["prisma"];

  assert.deepEqual(
    await createComment({
      prisma,
      postId: "post-1",
      authorId: "user-1",
      content: "Nice"
    }),
    {
      id: "comment-1",
      postId: "post-1",
      authorId: "user-1",
      content: "Nice",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      author: serializeUser(makeUser({ googleSub: "user-1" }))
    }
  );
});

test("comment service lists comments with descending pagination", async () => {
  const findManyCalls: unknown[] = [];
  const tx = {
    post: {
      findUnique: async () => ({
        id: "post-1"
      })
    },
    comment: {
      findMany: async (args: unknown) => {
        findManyCalls.push(args);
        return [
          {
            id: "comment-3",
            postId: "post-1",
            authorId: "user-3",
            content: "Third",
            createdAt,
            updatedAt,
            author: makeUser({ googleSub: "user-3" })
          },
          {
            id: "comment-2",
            postId: "post-1",
            authorId: "user-2",
            content: "Second",
            createdAt,
            updatedAt,
            author: makeUser({ googleSub: "user-2" })
          },
          {
            id: "comment-1",
            postId: "post-1",
            authorId: "user-1",
            content: "First",
            createdAt,
            updatedAt,
            author: makeUser({ googleSub: "user-1" })
          }
        ];
      }
    }
  };
  const prisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>
    ) => await callback(tx)
  } as unknown as FirstArg<typeof listComments>["prisma"];

  const result = await listComments({
    prisma,
    postId: "post-1",
    limit: 2,
    offset: 10
  });

  assert.deepEqual(findManyCalls[0], {
    where: {
      postId: "post-1"
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
    skip: 10,
    take: 3
  });
  assert.equal(result.status, "ok");

  if (result.status === "ok") {
    assert.equal(result.data.comments.length, 2);
    assert.deepEqual(result.data.pagination, {
      limit: 2,
      offset: 10,
      nextOffset: 12,
      hasMore: true
    });
  }
});

test("comment service reports missing posts when listing comments", async () => {
  const tx = {
    post: {
      findUnique: async () => null
    },
    comment: {
      findMany: async () => []
    }
  };
  const prisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>
    ) => await callback(tx)
  } as unknown as FirstArg<typeof listComments>["prisma"];

  assert.deepEqual(
    await listComments({
      prisma,
      postId: "missing",
      limit: 2,
      offset: 0
    }),
    {
      status: "post-not-found"
    }
  );
});

test("profile service loads profile stats, posts, follow state, and pagination", async () => {
  const findManyCalls: unknown[] = [];
  const tx = {
    user: {
      findUnique: async () => ({
        ...makeUser({ googleSub: "profile-1" }),
        _count: {
          posts: 2,
          following: 3,
          followers: 4
        }
      })
    },
    post: {
      findMany: async (args: unknown) => {
        findManyCalls.push(args);
        return [
          {
            id: "profile-post-2",
            authorId: "profile-1",
            imageUrl: "https://example.com/profile-2.jpg",
            caption: "Second",
            createdAt,
            updatedAt,
            likes: [{ id: "like-1" }],
            _count: {
              likes: 5,
              comments: 6
            }
          },
          {
            id: "profile-post-1",
            authorId: "profile-1",
            imageUrl: "https://example.com/profile-1.jpg",
            caption: null,
            createdAt,
            updatedAt,
            likes: [],
            _count: {
              likes: 1,
              comments: 0
            }
          }
        ];
      }
    },
    follow: {
      findUnique: async () => ({
        followerId: "viewer-1"
      })
    }
  };
  const prisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>
    ) => await callback(tx)
  } as unknown as FirstArg<typeof getProfile>["prisma"];

  const result = await getProfile({
    prisma,
    userId: "profile-1",
    viewerId: "viewer-1",
    limit: 1,
    offset: 7
  });

  assert.deepEqual(findManyCalls[0], {
    where: {
      authorId: "profile-1"
    },
    include: {
      likes: {
        where: {
          userId: "viewer-1"
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
    skip: 7,
    take: 2
  });
  assert.equal(result.status, "ok");

  if (result.status === "ok") {
    assert.deepEqual(result.data.stats, {
      postsCount: 2,
      followingCount: 3,
      followersCount: 4,
      viewerIsFollowing: true
    });
    assert.equal(result.data.posts.length, 1);
    assert.equal(result.data.posts[0]?.viewerHasLiked, true);
    assert.deepEqual(result.data.pagination, {
      limit: 1,
      offset: 7,
      nextOffset: 8,
      hasMore: true
    });
  }
});

test("profile service reports missing users", async () => {
  const tx = {
    user: {
      findUnique: async () => null
    },
    post: {
      findMany: async () => []
    },
    follow: {
      findUnique: async () => null
    }
  };
  const prisma = {
    $transaction: async <TResult>(
      callback: (transaction: typeof tx) => Promise<TResult>
    ) => await callback(tx)
  } as unknown as FirstArg<typeof getProfile>["prisma"];

  assert.deepEqual(
    await getProfile({
      prisma,
      userId: "missing",
      viewerId: "viewer-1",
      limit: 1,
      offset: 0
    }),
    {
      status: "user-not-found"
    }
  );
});
