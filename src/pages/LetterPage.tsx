import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";

import { Button, ButtonLink } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { DeliveryPicker } from "@/components/letter/DeliveryPicker";
import { LetterPreview } from "@/components/letter/LetterPreview";
import { useAuth } from "@/features/auth/AuthContext";
import { cancelMyLetter, deleteMyLetter, readLetter, rescheduleMyLetter, type OpenedLetter } from "@/lib/api";
import { countdown } from "@/lib/countdown";
import { customDateError, longDate, resolveDelivery, type Delivery } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

type Dialog = "cancel" | "delete" | "reschedule" | null;

/** /letter/:id: one letter, read (if allowed) and managed by its owner. */
export function LetterPage() {
  usePageTitle("Your letter");
  const { id = "" } = useParams();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [letter, setLetter] = useState<OpenedLetter | null>(null);
  const [sealedShut, setSealedShut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await readLetter(id);
    if (r.ok) setLetter(r);
    else if (r.code === "sealed") setSealedShut(true);
    else setError(r.error);
  }, [id]);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (loading) return <p className="mx-auto max-w-page px-4 py-24 text-pencil md:px-8">Loading…</p>;
  if (!session) return <Navigate to="/signin" replace />;

  async function act(kind: Exclude<Dialog, null>) {
    setBusy(true);
    setDialogError(null);
    let r;
    if (kind === "reschedule") {
      const when = resolveDelivery(delivery);
      const err = !delivery ? "Choose a date." : delivery.kind === "custom" ? customDateError(delivery.date) : null;
      if (err || !when) {
        setBusy(false);
        return setDialogError(err ?? "Choose a date.");
      }
      r = await rescheduleMyLetter(id, when.toISOString());
    } else {
      r = kind === "cancel" ? await cancelMyLetter(id) : await deleteMyLetter(id);
    }
    setBusy(false);
    if (!r.ok) return setDialogError(r.error);
    setDialog(null);
    if (kind === "reschedule") load();
    else navigate("/dashboard", { replace: true });
  }

  const status = letter?.status;
  const deliver = letter?.deliverAt ? new Date(letter.deliverAt) : null;

  return (
    <div className="mx-auto max-w-page px-4 pb-12 pt-8 md:px-8 md:pt-12">
      <Link to="/dashboard" className="inline-flex min-h-12 items-center text-sm">← Your letters</Link>

      {error && (
        <div className="py-12">
          <h1 className="text-2xl">We couldn't open this letter.</h1>
          <p role="alert" className="mt-4 text-pencil">{error}</p>
        </div>
      )}

      {sealedShut && (
        <div className="py-12">
          <h1 className="text-2xl">Sealed shut until it arrives.</h1>
          <p className="mt-4 max-w-prose text-pencil">You chose not to read this letter before delivery day.</p>
        </div>
      )}

      {letter && (
        <>
          <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">
                {status === "delivered" ? "Opened" : status === "draft" ? "Draft" : status === "failed" ? "Delivery failed" : "Sealed"}
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl">
                {status === "delivered"
                  ? `A letter from ${longDate(new Date(letter.createdAt))}`
                  : status === "draft"
                    ? "An unfinished letter"
                    : deliver
                      ? `Opens in ${countdown(deliver)}`
                      : "Sealed"}
              </h1>
              {deliver && status !== "draft" && (
                <p className="mt-2 text-pencil">
                  {status === "delivered" ? "Delivered" : "Arrives"} {longDate(deliver)}
                  {letter.email ? ` to ${letter.email}` : ""}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {status === "delivered" && (
                <ButtonLink to="/write" state={{ writeBack: letter.createdAt }}>Write back</ButtonLink>
              )}
              {status === "draft" && <ButtonLink to={`/write?draft=${letter.id}`}>Continue writing</ButtonLink>}
              {(status === "sealed" || status === "failed") && (
                <Button onClick={() => { setDelivery(null); setDialog("reschedule"); }}>
                  {status === "failed" ? "Pick a new date and retry" : "Reschedule"}
                </Button>
              )}
              {(status === "sealed" || status === "pending_verification" || status === "failed") && (
                <Button variant="secondary" onClick={() => setDialog("cancel")}>Cancel letter</Button>
              )}
              {(status === "delivered" || status === "draft") && (
                <Button variant="quiet" onClick={() => setDialog("delete")}>Delete</Button>
              )}
            </div>
          </header>

          {status === "pending_verification" && (
            <p className="mt-6 max-w-prose border-l-4 border-postal bg-paper-deep px-6 py-4">
              This letter is waiting for you to confirm your email address. Check your inbox for the link.
            </p>
          )}

          <div className="mt-8">
            <LetterPreview
              subject={letter.subject}
              body={letter.body}
              writtenOn={new Date(letter.createdAt)}
              deliverOn={letter.deliveredAt ? new Date(letter.deliveredAt) : deliver}
            />
          </div>
        </>
      )}

      <Modal open={dialog === "cancel"} onClose={() => setDialog(null)} title="Cancel this letter?">
        <p>It will be deleted and never sent. This can't be undone.</p>
        <DialogButtons busy={busy} error={dialogError} confirm="Cancel the letter" onConfirm={() => act("cancel")} onClose={() => setDialog(null)} />
      </Modal>
      <Modal open={dialog === "delete"} onClose={() => setDialog(null)} title={status === "draft" ? "Delete this draft?" : "Delete from your archive?"}>
        <p>{status === "draft" ? "The draft" : "The letter"} will be permanently deleted. This can't be undone.</p>
        <DialogButtons busy={busy} error={dialogError} confirm="Delete permanently" onConfirm={() => act("delete")} onClose={() => setDialog(null)} />
      </Modal>
      <Modal open={dialog === "reschedule"} onClose={() => setDialog(null)} title="Choose a new date" wide>
        <DeliveryPicker value={delivery} onChange={setDelivery} />
        <DialogButtons busy={busy} error={dialogError} confirm="Save new date" onConfirm={() => act("reschedule")} onClose={() => setDialog(null)} />
      </Modal>
    </div>
  );
}

function DialogButtons(p: { busy: boolean; error: string | null; confirm: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <>
      <p role="alert" className="mt-4 text-sm font-medium text-postal empty:hidden">{p.error ?? ""}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={p.onConfirm} disabled={p.busy}>{p.busy ? "Working…" : p.confirm}</Button>
        <Button variant="secondary" onClick={p.onClose} disabled={p.busy} data-autofocus>Keep it</Button>
      </div>
    </>
  );
}
