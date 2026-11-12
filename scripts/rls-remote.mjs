// Runs supabase/tests/database/rls.test.sql against the LINKED database without Docker.
//
// `supabase test db --remote` needs Docker for pg_prove. Instead we rewrite the
// pgTAP file so each assertion's output goes into a temp table, and the run
// ENDS BY RAISING AN EXCEPTION that carries the TAP output. The exception
// aborts the transaction, so every fixture (test users, letters, the pgtap
// extension itself) is rolled back no matter how the CLI handles transactions.
//
//   node scripts/rls-remote.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const src = readFileSync(new URL("../supabase/tests/database/rls.test.sql", import.meta.url), "utf8");

const assertion = /^select (plan|is|isnt|ok|results_eq|is_empty|isnt_empty|throws_ok|lives_ok)\(/gm;
let sql = src
  .replace(
    /^create extension if not exists pgtap with schema extensions;$/m,
    "$&\ncreate temp table tap (n serial, line text);\ngrant insert on tap to anon, authenticated;\ngrant usage on sequence tap_n_seq to anon, authenticated;",
  )
  .replace(assertion, "insert into pg_temp.tap (line) select $1(")
  .replace(/^select \* from finish\(\);$/m, "insert into pg_temp.tap (line) select * from finish();")
  .replace(
    /^rollback;$/m,
    "reset role;\ndo $$$$ begin raise exception 'TAP_BEGIN%TAP_END', (select string_agg(line, E'\\n' order by n) from pg_temp.tap); end $$$$;",
  );

if (!sql.includes("TAP_BEGIN") || !sql.includes("insert into pg_temp.tap")) {
  console.error("Could not transform the test file; refusing to run.");
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "dfm-rls-"));
const file = join(dir, "rls-remote.sql");
writeFileSync(file, sql);

let output = "";
try {
  output = execFileSync("npx", ["supabase", "db", "query", "--remote", "--yes", "-f", file], {
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
} catch (err) {
  output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
}

// Skip the format string itself ("TAP_BEGIN%TAP_END") if the CLI echoes the SQL.
const m = /TAP_BEGIN(?!%TAP_END)([\s\S]*?)TAP_END/.exec(output.replace(/\\\\n|\\n/g, "\n"));
if (!m) {
  console.error("No TAP output found. Raw CLI output:\n" + output);
  process.exit(2);
}
const tap = m[1].trim();
console.log(tap);
const failed = tap.split("\n").filter((l) => /^not ok/.test(l));
const planned = /^1\.\.(\d+)/m.exec(tap)?.[1];
const passed = tap.split("\n").filter((l) => /^ok /.test(l)).length;
console.log(`\n${passed}/${planned} passed${failed.length ? `, ${failed.length} FAILED` : ""}. All test data rolled back.`);
process.exit(failed.length || String(passed) !== planned ? 1 : 0);
