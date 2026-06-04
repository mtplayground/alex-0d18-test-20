import { createApp } from "./app.js";
import { getRuntimeConfig } from "./config/env.js";

const env = getRuntimeConfig().app;

const app = createApp();
const server = app.listen(env.PORT, env.HOST, () => {
  console.log(`Backend listening on http://${env.HOST}:${env.PORT}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  console.error("Failed to start backend server", {
    name: err.name,
    code: err.code,
    message: err.message,
    stack: err.stack
  });
  process.exitCode = 1;
});
