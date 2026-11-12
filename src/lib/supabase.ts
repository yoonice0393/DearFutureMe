import type { SupabaseClient } from "@supabase/supabase-js";

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const key: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when .env.local hasn't been filled in; the app then runs on local stubs. */
export const supabaseConfigured = Boolean(url && key && !url.includes("your-project-ref"));

let client: Promise<SupabaseClient | null> | undefined;

/**
 * The browser client (publishable key only; the service key never reaches the bundle).
 * Loaded on first use so the home page doesn't download ~100 KB it never needs.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  return (client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url!, key!, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }),
  ));
}

/** supabase-js stores the session under sb-<project-ref>-auth-token. */
const SESSION_KEY = url ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token` : "";

/** Synchronous best guess, so the header doesn't flash "Sign in" while the client loads. */
export function probablySignedIn(): boolean {
  try {
    return !!SESSION_KEY && !!localStorage.getItem(SESSION_KEY);
  } catch {
    return false;
  }
}
