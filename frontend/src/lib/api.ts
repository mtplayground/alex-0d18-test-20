import { frontendEnv } from "../config/env";

export type ApiUser = {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export type AuthResponse = {
  token: string;
  user: ApiUser;
};

export type ApiPost = {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  updatedAt: string;
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

function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = frontendEnv.apiBaseUrl.replace(/\/$/, "");

  return `${baseUrl}${normalizedPath}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function buildLoginUrl(returnTo: string): string {
  const loginUrl = new URL(getApiUrl("/api/auth/login"), window.location.href);
  loginUrl.searchParams.set("return_to", returnTo);
  return loginUrl.toString();
}

export async function exchangeAuthCallback(): Promise<AuthResponse> {
  const response = await fetch(getApiUrl("/api/auth/callback"), {
    credentials: "include"
  });

  return await parseJsonResponse<AuthResponse>(response);
}

export async function fetchCurrentUser(token: string): Promise<ApiUser> {
  const response = await fetch(getApiUrl("/me"), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const body = await parseJsonResponse<{ user: ApiUser }>(response);
  return body.user;
}

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
