import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { ButtonLink } from "@/components/Button";
import { SealAnimation } from "@/components/letter/SealAnimation";
import { verifyEmail } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * /verify?token=…: confirms the address for a web letter written without signing in.
 * Confirming is the purpose of this one-time link, so it runs on open (unlike manage
 * actions), and it's harmless to repeat.
 */
export function Verify() {
  usePageTitle("Confirm your email");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<
    { s: "working" } | { s: "sealed"; deliverAt: string; already: boolean } | { s: "error"; message: string }
  >({ s: "working" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode runs effects twice in development
    ran.current = true;
    if (!token) {
      setState({ s: "error", message: "This link is missing its code. Open it straight from the email." });
      return;
    }
    verifyEmail(token).then((r) => {
      if (r.ok) setState({ s: "sealed", deliverAt: r.deliverAt, already: r.already });
      else setState({ s: "error", message: r.error });
    });
    // Drop the token from the address bar and history.
    history.replaceState(null, "", "/verify");
  }, [token]);

  return (
    <section className="mx-auto max-w-page px-4 py-14 md:px-8 md:py-24">
      <div className="max-w-[640px]">
        {state.s === "working" && <p className="text-pencil" aria-live="polite">Confirming your address…</p>}
        {state.s === "sealed" && (
          <>
            <SealAnimation />
            <h1 className="mt-12 text-2xl md:text-3xl">{state.already ? "Already confirmed." : "Confirmed. Your letter is sealed."}</h1>
            <p className="mt-6 text-lg">
              It arrives on <strong className="font-semibold">{longDate(new Date(state.deliverAt))}</strong>. We've emailed you a
              receipt with a link to manage or cancel it.
            </p>
            <ButtonLink to="/write" variant="secondary" className="mt-8">Write another letter</ButtonLink>
          </>
        )}
        {state.s === "error" && (
          <>
            <h1 className="text-2xl md:text-3xl">We couldn't confirm that link.</h1>
            <p role="alert" className="mt-6 text-lg text-pencil">{state.message}</p>
            <ButtonLink to="/write" className="mt-8">Write a letter</ButtonLink>
          </>
        )}
      </div>
    </section>
  );
}
