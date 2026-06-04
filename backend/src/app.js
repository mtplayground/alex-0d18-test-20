import express from "express";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "backend"
    });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({
      error: "Not Found"
    });
  });

  app.use((err, _req, res, _next) => {
    console.error("Unhandled request error", {
      name: err?.name,
      code: err?.code,
      message: err?.message,
      stack: err?.stack
    });

    res.status(500).json({
      error: "Internal Server Error"
    });
  });

  return app;
}
