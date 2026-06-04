import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import test from "node:test";
import { config as loadDotenv } from "dotenv";
import { createApp } from "../app.js";
import { connectPrisma, disconnectPrisma } from "../db/prisma.js";
import type { ErrorResponseBody } from "../http/responses.js";
import { issueAppJwt } from "../services/authService.js";

type RouteTestContext = {
  baseUrl: string;
  server: Server;
  token: string;
  userId: string;
};

function loadRouteTestEnv(): void {
  loadDotenv({ path: join(process.cwd(), "../.env.production") });

  if (!process.env.DATABASE_URL) {
    const databaseUrlPath = join(process.cwd(), "../.database_url");

    if (existsSync(databaseUrlPath)) {
      process.env.DATABASE_URL = readFileSync(databaseUrlPath, "utf8").trim();
    }
  }

  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET ??=
    "issue-62-route-test-secret-at-least-thirty-two-characters";
  process.env.MCTAI_AUTH_URL ??= "https://auth.mctai.app";
  process.env.MCTAI_AUTH_APP_TOKEN ??= "route-test-app-token";
  process.env.MCTAI_AUTH_JWKS_URL ??= "https://auth.mctai.app/.well-known/jwks.json";
  process.env.SELF_URL ??= "https://route-test.example.com";
  process.env.S3_ACCESS_KEY_ID ??= "route-test-access-key";
  process.env.S3_SECRET_ACCESS_KEY ??= "route-test-secret-key";
  process.env.S3_BUCKET ??= "route-test-bucket";
  process.env.S3_PREFIX ??= "app_alex_0d18_test_20_abc966/";
  process.env.S3_ENDPOINT ??= "https://fly.storage.tigris.dev";
  process.env.S3_REGION ??= "auto";
  process.env.S3_FORCE_PATH_STYLE ??= "true";
  process.env.S3_PUBLIC_BASE_URL ??= "https://storage.example.com";
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

async function withRouteTestContext(
  run: (context: RouteTestContext) => Promise<void>
): Promise<void> {
  loadRouteTestEnv();

  const prisma = await connectPrisma();
  const runId = `issue-62-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const userId = `${runId}-viewer`;
  let server: Server | null = null;

  try {
    await prisma.user.deleteMany({
      where: {
        googleSub: userId
      }
    });

    const user = await prisma.user.create({
      data: {
        googleSub: userId,
        email: `${userId}@example.com`,
        name: "Issue 62 Route Tester",
        avatarUrl: "https://example.com/route-tester.jpg"
      }
    });
    const token = issueAppJwt(user);
    const app = createApp();
    const listening = await listen(app);
    server = listening.server;

    await run({
      baseUrl: listening.baseUrl,
      server,
      token,
      userId
    });
  } finally {
    if (server) {
      await closeServer(server);
    }

    await prisma.user.deleteMany({
      where: {
        googleSub: userId
      }
    });
    await disconnectPrisma();
  }
}

test("route errors preserve auth, not found, validation, and domain error responses", async () => {
  await withRouteTestContext(async ({ baseUrl, token }) => {
    const unauthorized = await requestJson<ErrorResponseBody>({
      baseUrl,
      path: "/me",
      expectedStatus: 401
    });
    assert.deepEqual(unauthorized, {
      error: "Missing bearer token",
      code: "UNAUTHORIZED"
    });

    const notFound = await requestJson<ErrorResponseBody>({
      baseUrl,
      path: "/api/not-a-route",
      token,
      expectedStatus: 404
    });
    assert.deepEqual(notFound, {
      error: "Not Found",
      code: "NOT_FOUND"
    });

    const invalidFeed = await requestJson<ErrorResponseBody>({
      baseUrl,
      path: "/api/feed?limit=0&offset=-1",
      token,
      expectedStatus: 400
    });
    assert.equal(invalidFeed.code, "VALIDATION_ERROR");
    assert.equal(invalidFeed.error, "Invalid feed request");
    assert.deepEqual(Object.keys(invalidFeed.details as object).sort(), [
      "limit",
      "offset"
    ]);

    const invalidUpload = await requestJson<ErrorResponseBody>({
      baseUrl,
      path: "/api/uploads/presigned-url",
      token,
      method: "POST",
      body: {
        fileName: "",
        contentType: "application/pdf",
        contentLength: 0
      },
      expectedStatus: 400
    });
    assert.equal(invalidUpload.code, "VALIDATION_ERROR");
    assert.equal(invalidUpload.error, "Invalid upload request");
    assert.deepEqual(Object.keys(invalidUpload.details as object).sort(), [
      "contentLength",
      "contentType",
      "fileName"
    ]);

    const invalidPostBody = await requestJson<ErrorResponseBody>({
      baseUrl,
      path: "/api/posts",
      token,
      method: "POST",
      body: {
        imageUrl: "not-a-url",
        caption: "Invalid image URL body"
      },
      expectedStatus: 400
    });
    assert.equal(invalidPostBody.code, "VALIDATION_ERROR");
    assert.equal(invalidPostBody.error, "Invalid post request");
    assert.deepEqual(Object.keys(invalidPostBody.details as object), [
      "imageUrl"
    ]);

    const invalidPostImageDomain = await requestJson<ErrorResponseBody>({
      baseUrl,
      path: "/api/posts",
      token,
      method: "POST",
      body: {
        imageUrl: "https://example.com/outside-prefix/post.jpg",
        caption: "Invalid image URL domain"
      },
      expectedStatus: 400
    });
    assert.deepEqual(invalidPostImageDomain, {
      error: "Image URL must reference an uploaded object",
      code: "INVALID_IMAGE_URL"
    });
  });
});
