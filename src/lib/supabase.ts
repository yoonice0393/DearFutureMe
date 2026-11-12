import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const key: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False when .env.local hasn't been filled in; the app then runs on local stubs. */
export const supabaseConfigured = Boolean(url && key && !url.includes("your-project-ref"));

/** Browser client: publishable key only. The service key never reaches the bundle. */
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
