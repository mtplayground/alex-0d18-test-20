import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();
loadDotenv({ path: "../.env" });

const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

const appEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required")
});

const authEnvSchema = z.object({
  MCTAI_AUTH_URL: z.string().url("MCTAI_AUTH_URL must be a valid URL"),
  MCTAI_AUTH_APP_TOKEN: z.string().min(1, "MCTAI_AUTH_APP_TOKEN is required"),
  MCTAI_AUTH_JWKS_URL: z
    .string()
    .url("MCTAI_AUTH_JWKS_URL must be a valid URL"),
  SELF_URL: z.string().url("SELF_URL must be a valid URL")
});

const s3EnvSchema = z.object({
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_PREFIX: z.string().min(1, "S3_PREFIX is required"),
  S3_ENDPOINT: z.string().url("S3_ENDPOINT must be a valid URL"),
  S3_REGION: z.string().min(1).default("auto"),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  S3_PUBLIC_BASE_URL: z.string().url("S3_PUBLIC_BASE_URL must be a valid URL")
});

const jwtEnvSchema = z.object({
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters")
});

export type AppEnv = z.infer<typeof appEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type S3Env = z.infer<typeof s3EnvSchema>;
export type JwtEnv = z.infer<typeof jwtEnvSchema>;

let cachedAppEnv: AppEnv | null = null;

function formatEnvError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
}

function parseEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  label: string,
  input: NodeJS.ProcessEnv = process.env
): z.infer<TSchema> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new Error(
      `${label} environment is invalid: ${formatEnvError(parsed.error)}`
    );
  }

  return parsed.data;
}

export function getEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  if (input === process.env && cachedAppEnv) {
    return cachedAppEnv;
  }

  const env = parseEnv(appEnvSchema, "Application", input);

  if (input === process.env) {
    cachedAppEnv = env;
  }

  return env;
}

export function getAuthEnv(input: NodeJS.ProcessEnv = process.env): AuthEnv {
  return parseEnv(authEnvSchema, "Authentication", input);
}

export function getS3Env(input: NodeJS.ProcessEnv = process.env): S3Env {
  return parseEnv(s3EnvSchema, "Object storage", input);
}

export function getJwtEnv(input: NodeJS.ProcessEnv = process.env): JwtEnv {
  return parseEnv(jwtEnvSchema, "JWT", input);
}
