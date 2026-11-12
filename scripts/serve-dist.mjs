// Serves dist/ the way Cloudflare Pages does, for local testing (Lighthouse, CSP):
//   /about → about.html, unknown paths → index.html (SPA), dist/_headers applied,
//   brotli/gzip compression.   node scripts/serve-dist.mjs [port]
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.argv[2] ?? 4174);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".woff": "font/woff", ".json": "application/json", ".txt": "text/plain; charset=utf-8",
};

function headerRules() {
  const file = join(dist, "_headers");
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    if (!line.startsWith(" ")) rules.push([line.trim(), []]);
    else rules.at(-1)[1].push([line.slice(0, line.indexOf(":")).trim(), line.slice(line.indexOf(":") + 1).trim()]);
  }
  return rules;
}

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, "");
  const candidates = [clean, `${clean}.html`, join(clean, "index.html")];
  for (const c of candidates) {
    const full = join(dist, c);
    if (full.startsWith(dist) && existsSync(full) && statSync(full).isFile()) return full;
  }
  return join(dist, "index.html"); // SPA fallback
}

// Cloudflare serves pre-compressed assets; compress each file once and reuse it
// so the test server doesn't add its own delay (Brotli at max quality is slow).
const compressed = new Map();
function compress(file, raw, encoding) {
  const key = `${encoding}:${file}:${statSync(file).mtimeMs}`;
  if (!compressed.has(key)) compressed.set(key, encoding === "br" ? brotliCompressSync(raw) : gzipSync(raw));
  return compressed.get(key);
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const file = resolveFile(url.pathname);
  for (const [path, headers] of headerRules()) {
    const match = path === "/*" || url.pathname === path || (path.endsWith("/*") && url.pathname.startsWith(path.slice(0, -1)));
    if (match) for (const [k, v] of headers) res.setHeader(k, v);
  }
  let body = readFileSync(file);
  const type = types[extname(file)] ?? "application/octet-stream";
  res.setHeader("Content-Type", type);
  const accept = String(req.headers["accept-encoding"] ?? "");
  if (/text|javascript|json|svg/.test(type)) {
    if (accept.includes("br")) {
      body = compress(file, body, "br");
      res.setHeader("Content-Encoding", "br");
    } else if (accept.includes("gzip")) {
      body = compress(file, body, "gzip");
      res.setHeader("Content-Encoding", "gzip");
    }
  }
  res.setHeader("Content-Length", body.length);
  res.end(body);
}).listen(port, () => console.log(`dist/ on http://localhost:${port} (Cloudflare Pages behaviour)`));
