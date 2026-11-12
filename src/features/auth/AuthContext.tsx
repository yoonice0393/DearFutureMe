import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { getSupabase, probablySignedIn, supabaseConfigured } from "@/lib/supabase";

type Ctx = {
  session: Session | null;
  email: string | null;
  loading: boolean;
  /** Before the client loads: is a session stored? Lets the header pick the right link immediately. */
  likelySignedIn: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({ session: null, email: null, loading: false, likelySignedIn: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [likelySignedIn] = useState(probablySignedIn);

  useEffect(() => {
    // Only load the client up front if a session exists (or a sign-in link is
    // being completed); other visitors load it when a page first needs it.
    const completingSignIn = /[?&]code=/.test(location.search);
    if (!supabaseConfigured || (!likelySignedIn && !completingSignIn)) {
      setLoading(false);
      return;
    }
    let unsub: (() => void) | undefined;
    let cancelled = false;
    getSupabase().then(async (sb) => {
      if (!sb || cancelled) return;
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
      unsub = sb.auth.onAuthStateChange((_event, s) => setSession(s)).data.subscription.unsubscribe;
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [likelySignedIn]);

  // Pages that need auth (sign-in, dashboard…) call this to wake the client up.
  const value = useMemo<Ctx>(
    () => ({
      session,
      email: session?.user.email?.toLowerCase() ?? null,
      loading,
      likelySignedIn: session ? true : loading ? likelySignedIn : false,
      signOut: async () => {
        await (await getSupabase())?.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading, likelySignedIn],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
