import { getApiUrl, parseJsonResponse } from "./http";
import type { ApiUser, AuthResponse } from "./types";

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
