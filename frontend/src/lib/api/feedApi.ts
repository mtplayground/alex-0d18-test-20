import { getApiUrl, parseJsonResponse } from "./http";
import type { FeedPage } from "./types";

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
