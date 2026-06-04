import {
  Router,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { getAuthEnv } from "../config/env.js";
import {
  issueAppJwt,
  serializeUser,
  upsertUserFromClaims,
  verifyMctaiSession
} from "../services/authService.js";

export const authRouter = Router();

function getMctaiSessionCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.mctai_session;
}

authRouter.get("/login", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const authEnv = getAuthEnv();
    const loginUrl = new URL("/login", authEnv.MCTAI_AUTH_URL);
    const returnToUrl = new URL("/api/auth/callback", authEnv.SELF_URL);

    loginUrl.searchParams.set("app_token", authEnv.MCTAI_AUTH_APP_TOKEN);
    loginUrl.searchParams.set("return_to", returnToUrl.toString());

    res.redirect(loginUrl.toString());
  } catch (error) {
    next(error);
  }
});

authRouter.get(
  "/callback",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = getMctaiSessionCookie(req);

      if (!sessionToken) {
        res.status(401).json({
          error: "Missing authenticated session"
        });
        return;
      }

      const claims = await verifyMctaiSession(sessionToken);
      const user = await upsertUserFromClaims(claims);
      const token = issueAppJwt(user);

      res.json({
        token,
        user: serializeUser(user)
      });
    } catch (error) {
      next(error);
    }
  }
);
