// Creates supabase/.env.secrets with fresh random server secrets.
// Never prints the values. Refuses to overwrite an existing file, because
// replacing LETTER_KEY would make every stored letter unreadable.
//
//   node scripts/gen-secrets.mjs
//   npx supabase secrets set --env-file supabase/.env.secrets
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const path = new URL("../supabase/.env.secrets", import.meta.url);
if (existsSync(path)) {
  console.error("supabase/.env.secrets already exists. Not overwriting (it holds LETTER_KEY).");
  process.exit(1);
}

const b64url = (n) => randomBytes(n).toString("base64url");
const lines = [
  "# Server-only secrets for Supabase Edge Functions. NEVER commit this file.",
  "# Keep an offline copy of LETTER_KEY: without it, stored letters and backups can't be decrypted.",
  `LETTER_KEY=${randomBytes(32).toString("base64")}`,
  `LINK_SECRET=${b64url(48)}`,
  `EMAIL_HASH_SECRET=${b64url(48)}`,
  "# Comma-separated origins allowed to call the functions; the first is used in email links.",
  "SITE_ORIGINS=http://localhost:5173",
  "# Enables the dev-only 'send now' path (Phase 5). Set to false in production.",
  "DEV_MODE=true",
  `CRON_SECRET=${b64url(36)}`,
  "# Filled in later phases:",
  "# Email: Brevo (primary), Resend (optional second provider).",
  "# BREVO_API_KEY=",
  "# MAIL_FROM_EMAIL=",
  "# MAIL_FROM_NAME=DearFutureMe",
  "# ADMIN_EMAIL=   (monthly status email; defaults to MAIL_FROM_EMAIL)",
  "# RESEND_API_KEY=",
  "# TURNSTILE_SECRET_KEY=",
  "",
];
writeFileSync(path, lines.join("\n"), { mode: 0o600 });
console.log("Wrote supabase/.env.secrets (values not shown).");
