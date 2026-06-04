import type { User } from "@prisma/client";
import jwt, {
  type JwtHeader,
  type JwtPayload,
  type SigningKeyCallback
} from "jsonwebtoken";
import jwksClient, { type JwksClient } from "jwks-rsa";
import { getAuthEnv, getJwtEnv } from "../config/env.js";
import { getPrismaClient } from "../db/prisma.js";

export type VerifiedAuthClaims = JwtPayload & {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export type PublicUser = {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

export function buildUserUpsertArgsFromClaims(claims: VerifiedAuthClaims) {
  const userData = {
    email: claims.email,
    name: claims.name ?? null,
    avatarUrl: claims.picture ?? null
  };

  return {
    where: {
      googleSub: claims.sub
    },
    update: userData,
    create: {
      googleSub: claims.sub,
      ...userData
    }
  };
}

const jwksClients = new Map<string, JwksClient>();

function getJwksClient(jwksUri: string): JwksClient {
  const cached = jwksClients.get(jwksUri);

  if (cached) {
    return cached;
  }

  const client = jwksClient({
    jwksUri,
    cache: true,
    rateLimit: true
  });

  jwksClients.set(jwksUri, client);
  return client;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringClaim(
  claims: Record<string, unknown>,
  key: string
): string | undefined {
  const value = claims[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeClaims(decoded: string | JwtPayload): VerifiedAuthClaims {
  if (typeof decoded === "string" || !isRecord(decoded)) {
    throw new Error("Authenticated session did not contain JWT claims");
  }

  const sub = getStringClaim(decoded, "sub");
  const email = getStringClaim(decoded, "email");

  if (!sub) {
    throw new Error("Authenticated session is missing subject");
  }

  if (!email) {
    throw new Error("Authenticated session is missing email");
  }

  return {
    ...decoded,
    sub,
    email,
    email_verified:
      typeof decoded.email_verified === "boolean"
        ? decoded.email_verified
        : undefined,
    name: getStringClaim(decoded, "name"),
    picture: getStringClaim(decoded, "picture")
  };
}

export async function verifyMctaiSession(
  sessionToken: string
): Promise<VerifiedAuthClaims> {
  const authEnv = getAuthEnv();
  const client = getJwksClient(authEnv.MCTAI_AUTH_JWKS_URL);

  return await new Promise<VerifiedAuthClaims>((resolve, reject) => {
    const getSigningKey = (
      header: JwtHeader,
      callback: SigningKeyCallback
    ): void => {
      if (!header.kid) {
        callback(new Error("Authenticated session is missing key id"));
        return;
      }

      client
        .getSigningKey(header.kid)
        .then((key) => callback(null, key.getPublicKey()))
        .catch((error: unknown) => {
          callback(error instanceof Error ? error : new Error(String(error)));
        });
    };

    jwt.verify(
      sessionToken,
      getSigningKey,
      {
        audience: authEnv.MCTAI_AUTH_APP_TOKEN,
        issuer: authEnv.MCTAI_AUTH_URL
      },
      (error, decoded) => {
        if (error) {
          reject(error);
          return;
        }

        if (!decoded) {
          reject(new Error("Authenticated session did not decode"));
          return;
        }

        try {
          resolve(normalizeClaims(decoded));
        } catch (normalizeError) {
          reject(normalizeError);
        }
      }
    );
  });
}

export async function upsertUserFromClaims(
  claims: VerifiedAuthClaims
): Promise<User> {
  const prisma = getPrismaClient();

  return await prisma.user.upsert(buildUserUpsertArgsFromClaims(claims));
}

export function issueAppJwt(user: User): string {
  const jwtEnv = getJwtEnv();

  return jwt.sign(
    {
      sub: user.googleSub,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    },
    jwtEnv.JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

export function serializeUser(user: User): PublicUser {
  return {
    googleSub: user.googleSub,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl
  };
}
