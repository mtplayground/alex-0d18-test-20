import { createContext } from "react";
import type { ApiUser } from "../lib/api/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  status: AuthStatus;
  token: string | null;
  user: ApiUser | null;
  signIn: () => void;
  signOut: () => void;
  completeSignIn: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
