export type FrontendEnv = Readonly<{
  apiBaseUrl: string;
  appEnv: string;
}>;

export function getFrontendEnv(): FrontendEnv {
  return Object.freeze({
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
    appEnv: import.meta.env.VITE_APP_ENV ?? import.meta.env.MODE
  });
}

export const frontendEnv = getFrontendEnv();
