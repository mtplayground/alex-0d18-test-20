import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import test from "node:test";
import { config as loadDotenv } from "dotenv";
import { createApp } from "../app.js";
import { connectPrisma, disconnectPrisma } from "../db/prisma.js";
import { issueAppJwt } from "../services/authService.js";

type ApiUser = {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type AuthenticatedUserResponse = {
  user: ApiUser;
};

type PresignedUploadResponse = {
  uploadUrl: string;
  method: "PUT";
  key: string;
  publicUrl: string;
  expiresIn: number;
  headers: {
    "Content-Type": string;
    "Content-Length": string;
  };
};

type PostResponse = {
  post: {
    id: string;
    authorId: string;
    imageUrl: string;
    caption: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

type FeedResponse = {
  posts: Array<{
    id: string;
    authorId: string;
    imageUrl: string;
    caption: string | null;
    likesCount: number;
    commentsCount: number;
    viewerHasLiked: boolean;
    author: ApiUser;
  }>;
  pagination: {
    hasMore: boolean;
    nextOffset: number | null;
  };
};

type FollowResponse = {
  following: boolean;
  followeeId: string;
};

type LikeResponse = {
  liked: boolean;
  postId: string;
  likesCount: number;
};

type CommentResponse = {
  comment: {
    id: string;
    postId: string;
    authorId: string;
    content: string;
    author: ApiUser;
  };
};

type CommentsResponse = {
  comments: CommentResponse["comment"][];
  pagination: {
    hasMore: boolean;
    nextOffset: number | null;
  };
};

function loadE2EEnv(): void {
  loadDotenv({ path: join(process.cwd(), "../.env.production") });

  if (!process.env.DATABASE_URL) {
    const databaseUrlPath = join(process.cwd(), "../.database_url");

    if (existsSync(databaseUrlPath)) {
      process.env.DATABASE_URL = readFileSync(databaseUrlPath, "utf8").trim();
    }
  }

  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??=
    "issue-27-e2e-test-secret-at-least-thirty-two-characters";
}

async function listen(app: ReturnType<typeof createApp>) {
  const server = createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`
  };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function requestJson<TBody>({
  baseUrl,
  path,
  token,
  method = "GET",
  body,
  expectedStatus
}: {
  baseUrl: string;
  path: string;
  token?: string;
  method?: string;
  body?: unknown;
  expectedStatus: number;
}): Promise<TBody> {
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  assert.equal(response.status, expectedStatus);
  return (await response.json()) as TBody;
}

test("core user flow: login, post, follow, feed, like, and comment", async () => {
  loadE2EEnv();

  const prisma = await connectPrisma();
  const runId = `issue-27-${Date.now()}`;
  const authorId = `${runId}-author`;
  const viewerId = `${runId}-viewer`;
  const userIds = [authorId, viewerId];
  let server: Server | null = null;

  try {
    await prisma.user.deleteMany({
      where: {
        googleSub: {
          in: userIds
        }
      }
    });

    const author = await prisma.user.create({
      data: {
        googleSub: authorId,
        email: `${authorId}@example.com`,
        name: "Issue 27 Author",
        avatarUrl: "https://example.com/author.jpg"
      }
    });
    const viewer = await prisma.user.create({
      data: {
        googleSub: viewerId,
        email: `${viewerId}@example.com`,
        name: "Issue 27 Viewer",
        avatarUrl: "https://example.com/viewer.jpg"
      }
    });
    const authorToken = issueAppJwt(author);
    const viewerToken = issueAppJwt(viewer);
    const app = createApp();
    const listening = await listen(app);
    server = listening.server;

    const signedInViewer = await requestJson<AuthenticatedUserResponse>({
      baseUrl: listening.baseUrl,
      path: "/me",
      token: viewerToken,
      expectedStatus: 200
    });
    assert.equal(signedInViewer.user.googleSub, viewerId);

    const upload = await requestJson<PresignedUploadResponse>({
      baseUrl: listening.baseUrl,
      path: "/api/uploads/presigned-url",
      token: authorToken,
      method: "POST",
      body: {
        fileName: "core-flow.png",
        contentType: "image/png",
        contentLength: 68
      },
      expectedStatus: 201
    });
    assert.equal(upload.method, "PUT");
    assert.ok(upload.key.startsWith(process.env.S3_PREFIX ?? ""));
    assert.ok(upload.publicUrl.includes(upload.key));

    const createdPost = await requestJson<PostResponse>({
      baseUrl: listening.baseUrl,
      path: "/api/posts",
      token: authorToken,
      method: "POST",
      body: {
        imageUrl: upload.publicUrl,
        caption: "Issue 27 core flow post"
      },
      expectedStatus: 201
    });
    assert.equal(createdPost.post.authorId, authorId);
    assert.equal(createdPost.post.caption, "Issue 27 core flow post");

    const emptyFeed = await requestJson<FeedResponse>({
      baseUrl: listening.baseUrl,
      path: "/api/feed",
      token: viewerToken,
      expectedStatus: 200
    });
    assert.equal(
      emptyFeed.posts.some((post) => post.id === createdPost.post.id),
      false
    );

    const follow = await requestJson<FollowResponse>({
      baseUrl: listening.baseUrl,
      path: `/api/follows/${encodeURIComponent(authorId)}`,
      token: viewerToken,
      method: "POST",
      expectedStatus: 200
    });
    assert.deepEqual(follow, {
      following: true,
      followeeId: authorId
    });

    const feed = await requestJson<FeedResponse>({
      baseUrl: listening.baseUrl,
      path: "/api/feed",
      token: viewerToken,
      expectedStatus: 200
    });
    const feedPost = feed.posts.find((post) => post.id === createdPost.post.id);
    assert.ok(feedPost);
    assert.equal(feedPost.author.googleSub, authorId);
    assert.equal(feedPost.likesCount, 0);
    assert.equal(feedPost.commentsCount, 0);

    const like = await requestJson<LikeResponse>({
      baseUrl: listening.baseUrl,
      path: `/api/likes/${encodeURIComponent(createdPost.post.id)}`,
      token: viewerToken,
      method: "POST",
      expectedStatus: 200
    });
    assert.deepEqual(like, {
      liked: true,
      postId: createdPost.post.id,
      likesCount: 1
    });

    const comment = await requestJson<CommentResponse>({
      baseUrl: listening.baseUrl,
      path: `/api/comments/${encodeURIComponent(createdPost.post.id)}`,
      token: viewerToken,
      method: "POST",
      body: {
        content: "Issue 27 comment"
      },
      expectedStatus: 201
    });
    assert.equal(comment.comment.authorId, viewerId);
    assert.equal(comment.comment.content, "Issue 27 comment");

    const comments = await requestJson<CommentsResponse>({
      baseUrl: listening.baseUrl,
      path: `/api/comments/${encodeURIComponent(createdPost.post.id)}`,
      token: viewerToken,
      expectedStatus: 200
    });
    assert.equal(
      comments.comments.some(
        (listedComment) => listedComment.id === comment.comment.id
      ),
      true
    );

    const updatedFeed = await requestJson<FeedResponse>({
      baseUrl: listening.baseUrl,
      path: "/api/feed",
      token: viewerToken,
      expectedStatus: 200
    });
    const updatedFeedPost = updatedFeed.posts.find(
      (post) => post.id === createdPost.post.id
    );
    assert.ok(updatedFeedPost);
    assert.equal(updatedFeedPost.likesCount, 1);
    assert.equal(updatedFeedPost.commentsCount, 1);
    assert.equal(updatedFeedPost.viewerHasLiked, true);
  } finally {
    if (server) {
      await closeServer(server);
    }

    await prisma.user.deleteMany({
      where: {
        googleSub: {
          in: userIds
        }
      }
    });
    await disconnectPrisma();
  }
});
