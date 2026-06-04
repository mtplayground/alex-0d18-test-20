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
