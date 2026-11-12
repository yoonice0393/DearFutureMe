import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { env, serviceKey } from "./env.ts";
import { HttpError } from "./http.ts";
import { sha256Hex } from "./tokens.ts";

let client: SupabaseClient | undefined;

/** Service-role client: bypasses RLS. Only ever used inside Edge Functions. */
export function db(): SupabaseClient {
  return (client ??= createClient(env("SUPABASE_URL"), serviceKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }));
}

/** The signed-in user from the Authorization header, or null for anonymous calls. */
export async function getUser(req: Request): Promise<User | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  // Publishable/anon keys are sent as the bearer by anonymous clients: not a user.
  if (!token || !token.startsWith("eyJ")) return null;
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function requireUser(req: Request): Promise<User> {
  const user = await getUser(req);
  if (!user) throw new HttpError(401, "auth", "Please sign in again.");
  return user;
}

/** Sliding-window limit. Throws 429 when over. Keys are hashed before storage. */
export async function rateLimit(scope: string, key: string, windowSeconds: number, max: number, message?: string) {
  const { data, error } = await db().rpc("rate_hit", {
    p_scope: scope,
    p_key: await sha256Hex(`${scope}:${key}`),
    p_window: `${windowSeconds} seconds`,
    p_max: max,
  });
  if (error) throw error;
  if (data !== true) {
    throw new HttpError(429, "rate_limited", message ?? "Too many attempts. Please wait a minute and try again.");
  }
}

export type KioskInfo = {
  kiosk_id: string;
  event_id: string;
  event_name: string;
  allowed_presets: number[];
  starts_at: string;
  ends_at: string;
  paused: boolean;
  usable: boolean;
};

export async function lookupKiosk(token: string): Promise<KioskInfo | null> {
  if (!token || token.length > 128) return null;
  const { data, error } = await db().rpc("kiosk_lookup", { p_token_hash: await sha256Hex(token) });
  if (error) throw error;
  return (data as KioskInfo[])[0] ?? null;
}

export function eventIsLive(e: { starts_at: string; ends_at: string; paused: boolean }, now = Date.now()) {
  return !e.paused && Date.parse(e.starts_at) <= now && now <= Date.parse(e.ends_at);
}
