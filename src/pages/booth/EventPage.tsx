import { useState } from "react";
import { useParams } from "react-router";

import { Button } from "@/components/Button";
import { LegalModal, type LegalDoc } from "@/components/LegalModal";
import { Wordmark } from "@/components/Wordmark";
import { DraftProvider } from "@/features/draft/DraftContext";
import { LetterFlow } from "@/features/booth/LetterFlow";
import { usePageTitle } from "@/lib/usePageTitle";

/**
 * /e/:eventCode, the booth flow on an attendee's own phone.
 * Drafts autosave on this device (scoped to the event) and are cleared on submit.
 * Event-code validation (live window, expiry, caps) arrives with the backend in Phase 4.
 */
export function EventPage() {
  usePageTitle("Write a letter");
  const { eventCode = "" } = useParams();
  const [session, setSession] = useState(0);
  const [doc, setDoc] = useState<LegalDoc | null>(null);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="border-b border-rule px-4 py-3">
        <Wordmark />
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-8 md:px-8">
        <DraftProvider key={session} storageKey={`dfm-draft:event:${eventCode}`}>
          <LetterFlow
            mode="event"
            eventCode={eventCode}
            renderSealed={(s) => (
              <>
                <p className="mt-6 text-lg">
                  It arrives on <strong className="font-semibold">{s.arrives}</strong>. We've emailed a
                  receipt to <strong className="[overflow-wrap:anywhere] font-semibold">{s.email}</strong>. You can use
                  it to cancel the letter or change the address.
                </p>
                <Button onClick={() => setSession((n) => n + 1)} className="mt-8 min-h-14 px-8 text-base">
                  Write another letter
                </Button>
              </>
            )}
          />
        </DraftProvider>
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
