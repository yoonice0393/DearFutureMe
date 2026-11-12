import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";

import { Button, ButtonLink } from "@/components/Button";
import { manageAction, manageView, type ManageView } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

type Action = "cancel" | "not-me" | "unsubscribe" | "send-now";

const CONFIRM: Record<Action, { title: string; body: string; button: string }> = {
  cancel: {
    title: "Cancel this letter?",
    body: "It will be deleted and never sent. This can't be undone.",
    button: "Yes, cancel the letter",
  },
  "not-me": {
    title: "Didn't write this?",
    body: "We'll delete every letter waiting for this address and never send anything to it again.",
    button: "Cancel and block this address",
  },
  unsubscribe: {
    title: "Stop all letters to this address?",
    body: "Letters waiting to be delivered here will be deleted, and we won't email this address again.",
    button: "Stop all letters",
  },
  "send-now": {
    title: "Send this letter now? (development)",
    body: "Delivers it immediately so you can see the real email. Only available while DEV_MODE is on.",
    button: "Send it now",
  },
};

/**
 * /manage/:token: what the receipt links open. Opening the page never changes
 * anything (email scanners open links automatically); every action needs a click.
 */
export function Manage() {
  usePageTitle("Manage your letter");
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const preset = params.get("action");
  const [view, setView] = useState<ManageView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(
    preset === "not-me" || preset === "unsubscribe" ? preset : null,
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ action: Action; message: string } | null>(null);

  useEffect(() => {
    manageView(token).then((r) => {
      if (r.ok) setView(r);
      else setError(r.error);
    });
  }, [token]);

  async function run(action: Action) {
    setBusy(true);
    const r = await manageAction(token, action);
    setBusy(false);
    setConfirming(null);
    if (!r.ok) return setError(r.error);
    const message =
      action === "cancel"
        ? "Your letter has been cancelled and deleted."
        : action === "send-now"
          ? r.status === "delivered"
            ? "Sent. Check the inbox (and the Spam folder)."
            : `Not sent: ${r.error ?? r.status}`
          : r.removed
            ? `Done. ${r.removed} waiting ${r.removed === 1 ? "letter was" : "letters were"} deleted, and this address is blocked.`
            : "Done. We won't send anything to this address again.";
    setDone({ action, message });
  }

  const letter = view?.kind === "letter" && view.exists ? view : null;

  return (
    <section className="mx-auto max-w-page px-4 py-14 md:px-8 md:py-24">
      <div className="max-w-[640px]">
        <p className="eyebrow">Your letter</p>

        {error && (
          <>
            <h1 className="mt-3 text-2xl md:text-3xl">That link didn't work.</h1>
            <p role="alert" className="mt-6 text-lg text-pencil">{error}</p>
          </>
        )}

        {!error && !view && <p className="mt-6 text-pencil" aria-live="polite">Looking up your letter…</p>}

        {done && (
          <>
            <h1 className="mt-3 text-2xl md:text-3xl">{done.action === "send-now" ? "Send now" : "All set."}</h1>
            <p role="status" className="mt-6 text-lg">{done.message}</p>
            <ButtonLink to="/write" variant="secondary" className="mt-8">Write a new letter</ButtonLink>
          </>
        )}

        {!error && !done && view && (
          <>
            {view.kind === "unsubscribe" && <h1 className="mt-3 text-2xl md:text-3xl">Email preferences</h1>}
            {view.kind === "letter" && !view.exists && (
              <>
                <h1 className="mt-3 text-2xl md:text-3xl">This letter isn't waiting anymore.</h1>
                <p className="mt-6 text-lg text-pencil">It may have been cancelled, or delivered and later removed.</p>
              </>
            )}
            {letter && (
              <>
                <h1 className="mt-3 text-2xl md:text-3xl">
                  {letter.status === "delivered" ? "This letter has been delivered." : "Sealed and waiting."}
                </h1>
                <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 border-y border-rule py-6">
                  <dt className="text-pencil">Written</dt>
                  <dd>{longDate(new Date(letter.writtenAt))}{letter.eventName ? ` at ${letter.eventName}` : ""}</dd>
                  <dt className="text-pencil">{letter.status === "delivered" ? "Delivered" : "Arrives"}</dt>
                  <dd>{longDate(new Date(letter.deliverAt))}</dd>
                  <dt className="text-pencil">To</dt>
                  <dd>{letter.email}</dd>
                </dl>
                <p className="mt-6 text-sm text-pencil">We can't show the letter itself here. It stays sealed until it arrives.</p>
              </>
            )}

            {confirming ? (
              <div role="alertdialog" aria-labelledby="confirm-title" className="mt-8 border-l-4 border-postal bg-paper-deep px-6 py-6">
                <h2 id="confirm-title" className="text-xl">{CONFIRM[confirming].title}</h2>
                <p className="mt-3">{CONFIRM[confirming].body}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => run(confirming)} disabled={busy}>{busy ? "Working…" : CONFIRM[confirming].button}</Button>
                  <Button variant="secondary" onClick={() => setConfirming(null)} disabled={busy}>Keep things as they are</Button>
                </div>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                {letter && letter.status !== "delivered" && (
                  <Button variant="secondary" onClick={() => setConfirming("cancel")}>Cancel this letter</Button>
                )}
                {letter && <Button variant="quiet" onClick={() => setConfirming("not-me")}>This wasn't me</Button>}
                {view.kind === "unsubscribe" && <Button onClick={() => setConfirming("unsubscribe")}>Stop all letters to this address</Button>}
                {letter?.devSendNow && import.meta.env.DEV && (
                  <Button variant="quiet" onClick={() => setConfirming("send-now")}>Send now (dev)</Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
