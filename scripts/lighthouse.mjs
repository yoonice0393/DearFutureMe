// Runs Lighthouse (mobile, simulated throttling) on several pages and prints
// the four category scores, plus anything failing below 0.9.
//   node scripts/lighthouse.mjs http://localhost:4174 / /write /booth
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [base, ...paths] = process.argv.slice(2);
if (!base || !paths.length) {
  console.error("usage: node scripts/lighthouse.mjs <base-url> <path> [path…]");
  process.exit(2);
}
const dir = mkdtempSync(join(tmpdir(), "dfm-lh-"));
let worst = 100;

for (const p of paths) {
  const out = join(dir, `${p.replace(/\W+/g, "_") || "home"}.json`);
  const args = ["--yes", "lighthouse@12", base + p, "--quiet", "--chrome-flags=--headless=new", "--output=json", `--output-path=${out}`];
  try {
    execFileSync("npx", args, { stdio: "ignore", shell: true });
  } catch {
    // On Windows Lighthouse sometimes fails to kill Chrome at the end; one retry.
    execFileSync("npx", args, { stdio: "ignore", shell: true });
  }
  const r = JSON.parse(readFileSync(out, "utf8"));
  const scores = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
  worst = Math.min(worst, ...Object.values(scores));
  console.log(`${p.padEnd(12)} perf ${scores.performance}  a11y ${scores.accessibility}  best ${scores["best-practices"]}  seo ${scores.seo}   LCP ${r.audits["largest-contentful-paint"].displayValue}  TBT ${r.audits["total-blocking-time"].displayValue}`);
  for (const cat of Object.values(r.categories)) {
    for (const ref of cat.auditRefs) {
      const a = r.audits[ref.id];
      if (ref.weight > 0 && a.score !== null && a.score < 0.9) {
        const items = a.details?.items?.slice(0, 2).map((i) => i.description ?? i.source?.url ?? i.node?.snippet ?? "").filter(Boolean);
        console.log(`     ✗ ${cat.title}: ${a.title}${items?.length ? ` — ${items.join(" | ").slice(0, 160)}` : ""}`);
      }
    }
  }
}
process.exit(worst >= 90 ? 0 : 1);
