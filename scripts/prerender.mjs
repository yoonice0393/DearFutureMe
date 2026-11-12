// Writes a prerendered HTML file per static page (see src/prerender.tsx):
//   /        → dist/index.html   (also the SPA fallback for every other URL)
//   /about   → dist/about.html   (Cloudflare Pages and `serve` map /about to about.html)
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url);
const { render, PAGES } = await import(pathToFileURL(fileURLToPath(new URL("dist-ssr/prerender.js", root))).href);

const template = readFileSync(new URL("dist/index.html", root), "utf8");
const placeholder = '<div id="root"></div>';
if (!template.includes(placeholder)) throw new Error("dist/index.html has no empty #root to fill");

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
for (const path of Object.keys(PAGES)) {
  let { html, title } = await render(path);
  // Our CSP allows exactly one inline script (by hash); strip anything else.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const page = template
    .replace('<html lang="en">', `<html lang="en" data-prerendered="${path}">`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
    .replace(placeholder, `<div id="root"><div data-prerender>${html}</div></div>`);
  const file = path === "/" ? "dist/index.html" : `dist${path}.html`;
  writeFileSync(new URL(file, root), page);
  console.log(`prerendered ${path.padEnd(9)} → ${file} (${(html.length / 1024).toFixed(1)} KB)`);
}
rmSync(new URL("dist-ssr", root), { recursive: true, force: true });
