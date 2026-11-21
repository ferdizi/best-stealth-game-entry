// serve.ts — tiny stdlib static server for local testing only (dev only).
// Serves game/ at localhost:8080 so the game can be played and screenshotted.
// Run: node serve.ts [port]   (default 8080)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "game");
const port = Number(process.argv[2] || 8080);

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
};

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  const path = url === "/" ? "/index.html" : url;
  const file = join(root, path);
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

server.listen(port, () => {
  console.log(`NeuroSplice dev server: open http://localhost:${port}/`);
  console.log(`Serving ${root} — add ?shot=start|play|hide|end for screenshot states, ?selftest=1 for the headless play-test.`);
});
