import { getApiUrl, parseJsonResponse } from "./http";
import type { ApiPost, PresignedUpload } from "./types";

export async function requestPresignedUpload({
  token,
  file
}: {
  token: string;
  file: File;
}): Promise<PresignedUpload> {
  const response = await fetch(getApiUrl("/api/uploads/presigned-url"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      contentLength: file.size
    })
  });

  return await parseJsonResponse<PresignedUpload>(response);
}

export async function uploadFileToStorage({
  file,
  upload
}: {
  file: File;
  upload: PresignedUpload;
}): Promise<void> {
  const response = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: {
      "Content-Type": upload.headers["Content-Type"]
    },
    body: file
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }
}

export async function createPost({
  token,
  imageUrl,
  caption
}: {
  token: string;
  imageUrl: string;
  caption: string;
}): Promise<ApiPost> {
  const response = await fetch(getApiUrl("/api/posts"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      imageUrl,
      caption
    })
  });

  const body = await parseJsonResponse<{ post: ApiPost }>(response);
  return body.post;
}
