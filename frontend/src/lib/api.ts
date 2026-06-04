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

export type ApiFeedPost = ApiPost & {
  author: ApiUser;
  likesCount: number;
  commentsCount: number;
  viewerHasLiked: boolean;
};

export type ApiProfilePost = ApiPost & {
  likesCount: number;
  commentsCount: number;
  viewerHasLiked: boolean;
};

export type FeedPage = {
  posts: ApiFeedPost[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
};

export type ApiProfile = {
  user: ApiUser;
  stats: {
    postsCount: number;
    followingCount: number;
    followersCount: number;
    viewerIsFollowing: boolean;
  };
  posts: ApiProfilePost[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
};

export type LikeState = {
  liked: boolean;
  postId: string;
  likesCount: number;
};

export type ApiComment = {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: ApiUser;
};

export type CommentsPage = {
  comments: ApiComment[];
  pagination: {
    limit: number;
    offset: number;
    nextOffset: number | null;
    hasMore: boolean;
  };
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

export async function fetchFeed({
  token,
  limit = 20,
  offset = 0
}: {
  token: string;
  limit?: number;
  offset?: number;
}): Promise<FeedPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  const response = await fetch(getApiUrl(`/api/feed?${params.toString()}`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await parseJsonResponse<FeedPage>(response);
}

export async function fetchProfile({
  token,
  userId,
  limit = 20,
  offset = 0
}: {
  token: string;
  userId: string;
  limit?: number;
  offset?: number;
}): Promise<ApiProfile> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  const response = await fetch(
    getApiUrl(
      `/api/profiles/${encodeURIComponent(userId)}?${params.toString()}`
    ),
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const body = await parseJsonResponse<{ profile: ApiProfile }>(response);
  return body.profile;
}

export async function followUser({
  token,
  userId
}: {
  token: string;
  userId: string;
}): Promise<void> {
  const response = await fetch(
    getApiUrl(`/api/follows/${encodeURIComponent(userId)}`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  await parseJsonResponse<unknown>(response);
}

export async function unfollowUser({
  token,
  userId
}: {
  token: string;
  userId: string;
}): Promise<void> {
  const response = await fetch(
    getApiUrl(`/api/follows/${encodeURIComponent(userId)}`),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  await parseJsonResponse<unknown>(response);
}

export async function likePost({
  token,
  postId
}: {
  token: string;
  postId: string;
}): Promise<LikeState> {
  const response = await fetch(
    getApiUrl(`/api/likes/${encodeURIComponent(postId)}`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return await parseJsonResponse<LikeState>(response);
}

export async function unlikePost({
  token,
  postId
}: {
  token: string;
  postId: string;
}): Promise<LikeState> {
  const response = await fetch(
    getApiUrl(`/api/likes/${encodeURIComponent(postId)}`),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return await parseJsonResponse<LikeState>(response);
}

export async function fetchComments({
  token,
  postId,
  limit = 50,
  offset = 0
}: {
  token: string;
  postId: string;
  limit?: number;
  offset?: number;
}): Promise<CommentsPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  const response = await fetch(
    getApiUrl(
      `/api/comments/${encodeURIComponent(postId)}?${params.toString()}`
    ),
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return await parseJsonResponse<CommentsPage>(response);
}

export async function createComment({
  token,
  postId,
  content
}: {
  token: string;
  postId: string;
  content: string;
}): Promise<ApiComment> {
  const response = await fetch(
    getApiUrl(`/api/comments/${encodeURIComponent(postId)}`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content
      })
    }
  );

  const body = await parseJsonResponse<{ comment: ApiComment }>(response);
  return body.comment;
}
