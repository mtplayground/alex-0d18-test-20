import { getApiUrl, parseJsonResponse } from "./http";
import type { ApiProfile } from "./types";

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
