import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { getRuntimeConfig } from "../config/env.js";

const PRESIGNED_UPLOAD_EXPIRES_SECONDS = 300;
const UPLOAD_KEY_PREFIX = "posts";

let cachedS3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const env = getRuntimeConfig().s3;

  cachedS3Client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY
    },
    requestChecksumCalculation: "WHEN_REQUIRED"
  });

  return cachedS3Client;
}

function getFileExtension(contentType: string): string {
  switch (contentType) {
    case "image/gif":
      return ".gif";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

function getPublicUrl(fullKey: string): string {
  const env = getRuntimeConfig().s3;
  const publicBaseUrl = env.S3_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${publicBaseUrl}/${fullKey}`;
}

export type PresignedUploadInput = {
  userId: string;
  contentType: string;
  contentLength: number;
};

export type PresignedUpload = {
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

export async function createPresignedUploadUrl({
  userId,
  contentType,
  contentLength
}: PresignedUploadInput): Promise<PresignedUpload> {
  const env = getRuntimeConfig().s3;
  const extension = getFileExtension(contentType);
  const now = new Date();
  const datePath = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0")
  ].join("/");
  const relativeKey = `${UPLOAD_KEY_PREFIX}/${datePath}/${userId}/${randomUUID()}${extension}`;
  const fullKey = `${env.S3_PREFIX}${relativeKey}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: fullKey,
    ContentType: contentType,
    ContentLength: contentLength
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: PRESIGNED_UPLOAD_EXPIRES_SECONDS
  });

  return {
    uploadUrl,
    method: "PUT",
    key: fullKey,
    publicUrl: getPublicUrl(fullKey),
    expiresIn: PRESIGNED_UPLOAD_EXPIRES_SECONDS,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(contentLength)
    }
  };
}
