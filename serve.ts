// 本地试玩服务器：静态托管 game/，默认 http://localhost:8080。
// 只做本地调试，不参与评分；跑法：node serve.ts [端口]
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("./game", import.meta.url)));
const port = Number(process.argv[2] ?? 8080);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  const path = normalize(join(root, decodeURIComponent(req.url?.split("?")[0] ?? "/")));
  if (!path.startsWith(root + sep) && path !== root) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, "index.html") : path;
  if (!existsSync(file)) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});

server.listen(port, () => {
  console.log(`超频实验室试玩：http://localhost:${port}/`);
});
