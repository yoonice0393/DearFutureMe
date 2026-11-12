/**
 * Edge Function configuration. Secrets come from `supabase secrets set`;
 * SUPABASE_URL and the service key are injected by the platform.
 */
import { importLetterKey } from "./crypto.ts";
import { hmacKey } from "./tokens.ts";

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  return Deno.env.get(name) || undefined;
}

/** Service key: legacy SUPABASE_SERVICE_ROLE_KEY, or the new SUPABASE_SECRET_KEYS JSON. */
export function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const json = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (json) {
    const keys = JSON.parse(json) as Record<string, string>;
    const first = keys.default ?? Object.values(keys)[0];
    if (first) return first;
  }
  throw new Error("No Supabase service key available");
}

// Keys are imported once per isolate and reused across requests.
let letterKey: Promise<CryptoKey> | undefined;
let linkKey: Promise<CryptoKey> | undefined;
let emailKey: Promise<CryptoKey> | undefined;

export const keys = {
  letter: () => (letterKey ??= importLetterKey(env("LETTER_KEY"))),
  link: () => (linkKey ??= hmacKey(env("LINK_SECRET"))),
  email: () => (emailKey ??= hmacKey(env("EMAIL_HASH_SECRET"))),
};

/** Public site origin(s), comma-separated. First one is used to build links. */
export function siteOrigins(): string[] {
  return (optionalEnv("SITE_ORIGINS") ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const isDevMode = () => optionalEnv("DEV_MODE") === "true";
