import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to connect to PostgreSQL");
  }

  return databaseUrl;
}

export function getPrismaClient(): PrismaClient {
  getDatabaseUrl();

  if (!prisma) {
    prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "production"
          ? ["warn", "error"]
          : ["warn", "error"]
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
