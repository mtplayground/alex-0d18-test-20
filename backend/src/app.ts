import cookieParser from "cookie-parser";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response
} from "express";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.js";
import { commentsRouter } from "./routes/comments.js";
import { feedRouter } from "./routes/feed.js";
import { followsRouter } from "./routes/follows.js";
import { likesRouter } from "./routes/likes.js";
import { meRouter } from "./routes/me.js";
import { postsRouter } from "./routes/posts.js";
import { profilesRouter } from "./routes/profiles.js";
import { uploadsRouter } from "./routes/uploads.js";
import { sendError } from "./http/responses.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const frontendDistPath = resolve(currentDir, "../../frontend/dist");
const frontendIndexPath = join(frontendDistPath, "index.html");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/auth", authRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/follows", followsRouter);
  app.use("/api/likes", likesRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/profiles", profilesRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/me", meRouter);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "backend"
    });
  });

  app.use("/api", (_req: Request, res: Response) => {
    sendError(res, 404, "NOT_FOUND", "Not Found");
  });

  if (existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(frontendIndexPath);
    });
  }

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("Unhandled request error", {
      name: err instanceof Error ? err.name : undefined,
      code:
        typeof err === "object" && err !== null && "code" in err
          ? err.code
          : undefined,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });

    if (res.headersSent) {
      return;
    }

    sendError(res, 500, "INTERNAL_SERVER_ERROR", "Internal Server Error");
  };

  app.use(errorHandler);

  return app;
}
