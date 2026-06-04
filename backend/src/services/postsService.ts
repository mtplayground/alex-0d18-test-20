import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { S3Env } from "../config/env.js";

export const MAX_CAPTION_LENGTH = 2_200;

export const createPostSchema = z.object({
  imageUrl: z.string().url(),
  caption: z
    .string()
    .trim()
    .max(MAX_CAPTION_LENGTH)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))
});

export type PublicPost = {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
};

type PostRecord = {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PostWriter = Pick<PrismaClient, "post">;

export function getAllowedImageUrlPrefix(env: S3Env): string {
  const publicBaseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${publicBaseUrl}/${env.S3_PREFIX}`;
}

export function isAllowedPostImageUrl(imageUrl: string, env: S3Env): boolean {
  return imageUrl.startsWith(getAllowedImageUrlPrefix(env));
}

export function serializePost(post: PostRecord): PublicPost {
  return {
    id: post.id,
    authorId: post.authorId,
    imageUrl: post.imageUrl,
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString()
  };
}

export async function createPost({
  prisma,
  authorId,
  imageUrl,
  caption,
  s3Env
}: {
  prisma: PostWriter;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  s3Env: S3Env;
}): Promise<
  | {
      status: "created";
      post: PublicPost;
    }
  | {
      status: "invalid-image-url";
    }
> {
  if (!isAllowedPostImageUrl(imageUrl, s3Env)) {
    return {
      status: "invalid-image-url"
    };
  }

  const post = await prisma.post.create({
    data: {
      authorId,
      imageUrl,
      caption
    }
  });

  return {
    status: "created",
    post: serializePost(post)
  };
}
