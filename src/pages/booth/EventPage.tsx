import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { Button, ButtonLink } from "@/components/Button";
import { LegalModal, type LegalDoc } from "@/components/LegalModal";
import { Wordmark } from "@/components/Wordmark";
import { DraftProvider } from "@/features/draft/DraftContext";
import { LetterFlow } from "@/features/booth/LetterFlow";
import { eventStatus } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase";
import { removeKey } from "@/lib/storage";
import { usePageTitle } from "@/lib/usePageTitle";

type Check =
  | { state: "checking" }
  | { state: "ok"; eventName?: string }
  | { state: "closed"; reason: string; eventName?: string };

/**
 * /e/:eventCode, the booth flow on an attendee's own phone.
 * The code is checked before writing starts; an expired code or a finished event
 * falls back to the normal (verified) website flow. Drafts autosave on this device,
 * scoped to the event, and are cleared on submit.
 */
export function EventPage() {
  usePageTitle("Write a letter");
  const { eventCode = "" } = useParams();
  const [session, setSession] = useState(0);
  const [doc, setDoc] = useState<LegalDoc | null>(null);
  const [check, setCheck] = useState<Check>(supabaseConfigured ? { state: "checking" } : { state: "ok" });

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    eventStatus(eventCode).then((r) => {
      if (cancelled) return;
      if (!r.ok) setCheck({ state: "ok" }); // can't reach the server: let them write; submit reports problems
      else if (r.valid) setCheck({ state: "ok", eventName: r.eventName });
      else setCheck({ state: "closed", reason: r.reason ?? "ended", eventName: r.eventName });
    });
    return () => {
      cancelled = true;
    };
  }, [eventCode]);

  // Drafts from older codes of the same event are dead weight once the code changes.
  const storageKey = `dfm-draft:event:${eventCode}`;
  useEffect(() => {
    if (check.state === "closed") removeKey(storageKey);
  }, [check.state, storageKey]);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3">
        <Wordmark />
        {check.state === "ok" && check.eventName && <p className="text-sm text-pencil">{check.eventName}</p>}
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-8 md:px-8">
        {check.state === "checking" && <p className="py-24 text-pencil">Checking the code…</p>}

        {check.state === "closed" && (
          <section className="max-w-[640px] py-12">
            <h1 className="text-2xl">
              {check.reason === "expired"
                ? "This QR code has expired."
                : check.reason === "invalid"
                  ? "This link doesn't look right."
                  : "This event has ended."}
            </h1>
            <p className="mt-6 text-lg text-pencil">
              {check.reason === "expired"
                ? "If you're still at the booth, scan the code on the screen again. "
                : ""}
              You can still write a letter here. We'll just ask you to confirm your email address first.
            </p>
            <ButtonLink to="/write" className="mt-8">Write a letter on the website</ButtonLink>
          </section>
        )}

        {check.state === "ok" && (
          <DraftProvider key={session} storageKey={storageKey}>
            <LetterFlow
              mode="event"
              eventCode={eventCode}
              eventName={check.eventName}
              renderSealed={(s) => (
                <>
                  <p className="mt-6 text-lg">
                    It arrives on <strong className="font-semibold">{s.arrives}</strong>. We've emailed a
                    receipt to <strong className="[overflow-wrap:anywhere] font-semibold">{s.email}</strong>. You can
                    use it to cancel the letter or change the address.
                  </p>
                  <Button onClick={() => setSession((n) => n + 1)} className="mt-8 min-h-14 px-8 text-base">
                    Write another letter
                  </Button>
                </>
              )}
            />
          </DraftProvider>
        )}
      </main>
      <footer className="border-t border-rule px-4 py-4 text-sm text-pencil">
        <button type="button" onClick={() => setDoc("privacy")} className="inline-flex min-h-12 items-center underline underline-offset-4">
          Privacy
        </button>
        <span aria-hidden="true"> · </span>
        <button type="button" onClick={() => setDoc("terms")} className="inline-flex min-h-12 items-center underline underline-offset-4">
          Terms
        </button>
      </footer>
      <LegalModal doc={doc} onClose={() => setDoc(null)} />
    </div>
  );
}
