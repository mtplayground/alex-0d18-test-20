import type { PublicUser } from "../services/authService.js";
import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { getJwtEnv } from "../config/env.js";
import { getPrismaClient } from "../db/prisma.js";
import { serializeUser } from "../services/authService.js";

export type AppJwtClaims = JwtPayload & {
  sub: string;
  email?: string;
};

export type AuthContext = {
  claims: AppJwtClaims;
  user: PublicUser;
};

function getBearerToken(req: Request): string | null {
  const authorization = req.header("Authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function normalizeAppJwtClaims(decoded: string | JwtPayload): AppJwtClaims {
  if (typeof decoded === "string" || typeof decoded.sub !== "string") {
    throw new Error("JWT is missing subject");
  }

  return {
    ...decoded,
    sub: decoded.sub,
    email: typeof decoded.email === "string" ? decoded.email : undefined
  };
}

function verifyAppJwt(token: string): AppJwtClaims {
  const jwtEnv = getJwtEnv();
  const decoded = jwt.verify(token, jwtEnv.JWT_SECRET);
  return normalizeAppJwtClaims(decoded);
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getBearerToken(req);

    if (!token) {
      res.status(401).json({
        error: "Missing bearer token"
      });
      return;
    }

    let claims: AppJwtClaims;

    try {
      claims = verifyAppJwt(token);
    } catch {
      res.status(401).json({
        error: "Invalid bearer token"
      });
      return;
    }

    const user = await getPrismaClient().user.findUnique({
      where: {
        googleSub: claims.sub
      }
    });

    if (!user) {
      res.status(401).json({
        error: "User not found"
      });
      return;
    }

    req.auth = {
      claims,
      user: serializeUser(user)
    };

    next();
  } catch (error) {
    next(error);
  }
}
