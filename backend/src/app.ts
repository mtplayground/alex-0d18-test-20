import cookieParser from "cookie-parser";
import express, {
  type ErrorRequestHandler,
  type Request,
  type Response
} from "express";
import { authRouter } from "./routes/auth.js";
import { feedRouter } from "./routes/feed.js";
import { followsRouter } from "./routes/follows.js";
import { likesRouter } from "./routes/likes.js";
import { meRouter } from "./routes/me.js";
import { postsRouter } from "./routes/posts.js";
import { uploadsRouter } from "./routes/uploads.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/auth", authRouter);
  app.use("/api/feed", feedRouter);
  app.use("/api/follows", followsRouter);
  app.use("/api/likes", likesRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/me", meRouter);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: "backend"
    });
  });

  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found"
    });
  });

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

    res.status(500).json({
      error: "Internal Server Error"
    });
  };

  app.use(errorHandler);

  return app;
}
