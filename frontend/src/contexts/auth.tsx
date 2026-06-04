import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus
} from "./authState";
import {
  buildLoginUrl,
  exchangeAuthCallback,
  fetchCurrentUser,
  type ApiUser
} from "../lib/api";

const TOKEN_STORAGE_KEY = "auth_token";

function getStoredToken(): string | null {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setStoredToken(token: string): void {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function clearStoredToken(): void {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const loadStoredSession = useCallback(async () => {
    const storedToken = getStoredToken();

    if (!storedToken) {
      setStatus("unauthenticated");
      return;
    }

    try {
      const currentUser = await fetchCurrentUser(storedToken);
      setToken(storedToken);
      setUser(currentUser);
      setStatus("authenticated");
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    void loadStoredSession();
  }, [loadStoredSession]);

  const signIn = useCallback(() => {
    const returnTo = `${window.location.origin}/auth/callback`;
    window.location.assign(buildLoginUrl(returnTo));
  }, []);

  const completeSignIn = useCallback(async () => {
    const authResponse = await exchangeAuthCallback();
    setStoredToken(authResponse.token);
    setToken(authResponse.token);
    setUser(authResponse.user);
    setStatus("authenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      token,
      user,
      signIn,
      signOut,
      completeSignIn
    }),
    [completeSignIn, signIn, signOut, status, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
