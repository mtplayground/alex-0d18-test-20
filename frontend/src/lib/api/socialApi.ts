import { getApiUrl, parseJsonResponse } from "./http";
import type { ApiComment, CommentsPage, LikeState } from "./types";

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
