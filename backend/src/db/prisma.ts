import { PrismaClient } from "@prisma/client";
import { getEnv } from "../config/env.js";

let prisma: PrismaClient | null = null;

export function getDatabaseUrl(): string {
  return getEnv().DATABASE_URL;
}

export function getPrismaClient(): PrismaClient {
  getDatabaseUrl();

  if (!prisma) {
    const env = getEnv();

    prisma = new PrismaClient({
      log: env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"]
    });
  }

  return prisma;
}

export async function connectPrisma(): Promise<PrismaClient> {
  const client = getPrismaClient();
  await client.$connect();
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (!prisma) {
    return;
  }

  await prisma.$disconnect();
  prisma = null;
}
