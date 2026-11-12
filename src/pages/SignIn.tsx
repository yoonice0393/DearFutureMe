import { useRef, useState } from "react";
import { Navigate } from "react-router";

import { emailSchema } from "@shared/letter.ts";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { EmailField } from "@/components/letter/EmailField";
import { useAuth } from "@/features/auth/AuthContext";
import { getSupabase } from "@/lib/supabase";
import { usePageTitle } from "@/lib/usePageTitle";

export function SignIn() {
  usePageTitle("Sign in");
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Passed to Supabase Auth, which checks it once CAPTCHA protection is enabled
  // in the dashboard (Authentication → Attack Protection → Turnstile).
  const [botToken, setBotToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  if (session) return <Navigate to="/dashboard" replace />;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    const supabase = await getSupabase();
    if (!supabase) return setError("Sign-in isn't set up yet on this copy of the site.");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
        shouldCreateUser: true,
        captchaToken: botToken ?? undefined,
      },
    });
    setBusy(false);
    turnstile.current?.reset();
    if (err) {
      setError(
        err.status === 429
          ? "We've sent a few links already. Please wait a minute, then try again."
          : "We couldn't send the link. Please check the address and try again.",
      );
      return;
    }
    setSentTo(parsed.data);
  }

  return (
    <>
      <PageHeader eyebrow="Your letters" title={sentTo ? "Check your inbox" : "Sign in with a link"}>
        {sentTo ? (
          <p>
            We sent a sign-in link to <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{sentTo}</strong>.
            Open it on this device. It works once and expires in an hour.
          </p>
        ) : (
          <p>No password. We'll email you a one-time link. New here? The same link creates your account.</p>
        )}
      </PageHeader>
      <div className="mx-auto max-w-page px-4 md:px-8">
        {sentTo ? (
          <Button variant="secondary" onClick={() => setSentTo(null)}>
            Use a different address
          </Button>
        ) : (
          <form onSubmit={send} noValidate className="max-w-[520px] space-y-6">
            <Turnstile ref={turnstile} onToken={setBotToken} action="signin" />
            <EmailField
              hint="We'll email you a one-time sign-in link."
              value={email}
              onChange={(v) => {
                setEmail(v);
                setError(null);
              }}
              error={error}
            />
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </form>
        )}
      </div>
    </>
  );
}
