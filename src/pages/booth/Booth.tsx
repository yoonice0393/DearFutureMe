import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/Button";
import { LegalModal, type LegalDoc } from "@/components/LegalModal";
import { Postmark } from "@/components/Postmark";
import { Stamp } from "@/components/Stamp";
import { Wordmark } from "@/components/Wordmark";
import { DraftProvider } from "@/features/draft/DraftContext";
import { IdleGuard } from "@/features/booth/IdleGuard";
import { LetterFlow, type Sealed } from "@/features/booth/LetterFlow";
import { readKiosk } from "@/features/booth/kiosk";
import { shortDate } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

const RESET_SECONDS = 8;

/**
 * Kiosk mode on shared devices. No account, no verification, nothing on disk.
 * Every reset remounts the draft (memory only) and replaces the history entry.
 */
export function Booth() {
  usePageTitle("Write a letter");
  const kiosk = readKiosk();
  const [session, setSession] = useState(0);
  const [started, setStarted] = useState(false);
  const [doc, setDoc] = useState<LegalDoc | null>(null);

  const reset = useCallback(() => {
    setStarted(false);
    setDoc(null);
    setSession((s) => s + 1); // new DraftProvider: previous letter is gone from memory
    history.replaceState(null, "", location.pathname);
    window.getSelection()?.removeAllRanges();
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo({ top: 0 });
  }, []);

  if (!kiosk) return <Unregistered />;

  return (
    <BoothShell eventName={kiosk.eventName} dev={kiosk.token === "dev-kiosk"}>
      <IdleGuard active={started} onTimeout={reset} />
      {!started ? (
        <Welcome onStart={() => setStarted(true)} onDoc={setDoc} />
      ) : (
        <DraftProvider key={session} storageKey={null}>
          <LetterFlow
            mode="booth"
            kioskToken={kiosk.token}
            eventName={kiosk.eventName}
            renderSealed={(s) => <BoothSealed sealed={s} onDone={reset} />}
          />
        </DraftProvider>
      )}
      <LegalModal doc={doc} onClose={() => setDoc(null)} />
    </BoothShell>
  );
}

function BoothShell({ eventName, dev, children }: { eventName?: string; dev?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 md:px-12">
        <Wordmark />
        <p className="text-sm text-pencil">
          {eventName}
          {dev && <span className="ml-2 rounded-sm border border-postal px-2 py-0.5 text-xs text-postal">dev device</span>}
        </p>
      </header>
      <main className="mx-auto w-full max-w-page flex-1 px-4 py-8 md:px-12 md:py-12">{children}</main>
    </div>
  );
}

function Welcome({ onStart, onDoc }: { onStart: () => void; onDoc: (d: LegalDoc) => void }) {
  return (
    <section className="grid items-center gap-12 py-8 md:grid-cols-12 md:py-16">
      <div className="md:col-span-7">
        <p className="eyebrow">Post that takes its time</p>
        <h1 className="mt-4 text-3xl">Write a letter to your future self.</h1>
        <p className="mt-6 max-w-prose text-lg text-pencil">
          It takes about three minutes. We'll seal it and email it back to you in six months, a year,
          or ten. No account needed.
        </p>
        <Button onClick={onStart} className="mt-12 min-h-16 px-12 text-lg" autoFocus>
          Start writing
        </Button>
        <p className="mt-8 text-sm text-pencil">
          Nothing you write is saved on this device. The screen clears itself when you're done.{" "}
          <button type="button" onClick={() => onDoc("privacy")} className="inline-flex min-h-12 items-center text-postal underline underline-offset-4">
            Privacy
          </button>{" "}
          ·{" "}
          <button type="button" onClick={() => onDoc("terms")} className="inline-flex min-h-12 items-center text-postal underline underline-offset-4">
            Terms
          </button>
        </p>
      </div>
      <div aria-hidden="true" className="relative hidden md:col-span-4 md:col-start-9 md:block">
        <div className="sheet aspect-[4/5] -rotate-3" />
        <Stamp label="1 YEAR" className="absolute -top-6 right-6 w-20 rotate-6" />
        <Postmark date={shortDate(new Date())} className="absolute -bottom-10 -left-6 w-48 -rotate-6" />
      </div>
    </section>
  );
}

function BoothSealed({ sealed, onDone }: { sealed: Sealed; onDone: () => void }) {
  const [left, setLeft] = useState(RESET_SECONDS);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left, onDone]);

  return (
    <>
      <p className="mt-6 text-lg">
        It arrives on <strong className="font-semibold">{sealed.arrives}</strong>. We've sent a receipt
        to <strong className="[overflow-wrap:anywhere] font-semibold">{sealed.email}</strong>. If anything's wrong, it
        has a link to cancel.
      </p>
      <p className="mt-8 text-sm text-pencil" aria-live="polite">
        This screen clears in {left} {left === 1 ? "second" : "seconds"} for the next person.
      </p>
      <Button onClick={onDone} className="mt-6 min-h-14 px-8 text-base">
        Done
      </Button>
    </>
  );
}

function Unregistered() {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-24">
      <Wordmark />
      <h1 className="mt-12 text-2xl">This device isn't set up as a booth yet.</h1>
      <p className="mt-6 text-lg text-pencil">
        Event staff: open <strong className="font-semibold text-ink">/booth/setup</strong> on this device
        and enter the staff PIN.
      </p>
    </div>
  );
}
