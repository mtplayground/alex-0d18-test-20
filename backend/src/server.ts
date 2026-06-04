import { createApp } from "./app.js";

const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "8080", 10);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

const app = createApp();
const server = app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
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
