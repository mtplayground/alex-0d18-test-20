import { frontendEnv } from "../../config/env";

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = frontendEnv.apiBaseUrl.replace(/\/$/, "");

  return `${baseUrl}${normalizedPath}`;
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
