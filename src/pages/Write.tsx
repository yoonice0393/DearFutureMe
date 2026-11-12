import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { defaultSubject, letterContentSchema } from "@shared/letter.ts";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Composer } from "@/components/letter/Composer";
import { LetterPreview } from "@/components/letter/LetterPreview";
import { useAuth } from "@/features/auth/AuthContext";
import { useDraft } from "@/features/draft/DraftContext";
import { readLetter } from "@/lib/api";
import { longDate, resolveDelivery } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

type Incoming = { serverId: string; subject: string; body: string };

export function Write() {
  usePageTitle("Write your letter");
  const { draft, update, wipe } = useDraft();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [incoming, setIncoming] = useState<Incoming | null>(null);

  // /write?draft=<id>: open a draft saved to the account.
  const draftId = params.get("draft");
  useEffect(() => {
    if (!draftId || !session) return;
    readLetter(draftId).then((r) => {
      setParams({}, { replace: true });
      if (!r.ok || r.status !== "draft") return setError("That draft couldn't be opened. It may have been deleted.");
      const next = { serverId: r.id, subject: r.subject, body: r.body };
      // Never silently overwrite something else being written on this device.
      if (draft.body.trim() && draft.serverId !== r.id) setIncoming(next);
      else update(next);
    });
  }, [draftId, session]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Write back" from an opened letter.
  const writeBack = (location.state as { writeBack?: string } | null)?.writeBack;
  useEffect(() => {
    if (!writeBack) return;
    navigate(location.pathname, { replace: true, state: null });
    const opener = `Dear future me,\n\nI just read the letter I wrote on ${longDate(new Date(writeBack))}. `;
    const next = { serverId: undefined, subject: defaultSubject(), body: opener, startedAt: new Date().toISOString() };
    if (draft.body.trim()) setIncoming({ serverId: "", subject: next.subject, body: next.body });
    else update(next);
  }, [writeBack]); // eslint-disable-line react-hooks/exhaustive-deps

  function next() {
    const r = letterContentSchema.safeParse({ subject: draft.subject, body: draft.body });
    if (!r.success) return setError(r.error.issues[0].message);
    setError(null);
    navigate("/schedule");
  }

  return (
    <div className="mx-auto max-w-page px-4 pb-12 pt-8 md:px-8 md:pt-12">
      <p className="eyebrow">Step 1 of 2</p>
      <h1 className="mt-3 text-2xl md:text-3xl">Dear future me…</h1>
      <p className="mt-4 max-w-prose text-pencil">
        Write freely, answer a few guided questions, or start from a template. Your draft saves on
        this device as you type.
      </p>

      <div className="mt-8">
        <Composer />
      </div>

      <p role="alert" className="mt-4 text-base font-medium text-postal empty:hidden">
        {error ?? ""}
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
        <Button onClick={next}>Next: choose when it arrives</Button>
        <Button variant="secondary" onClick={() => setPreview(true)}>
          Preview
        </Button>
        <Button variant="quiet" onClick={() => setConfirmClear(true)} disabled={!draft.body.trim()}>
          Start over
        </Button>
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title="Preview" wide>
        <div className="-mx-6 -my-6">
          <LetterPreview
            subject={draft.subject}
            body={draft.body}
            writtenOn={new Date(draft.startedAt)}
            deliverOn={resolveDelivery(draft.delivery)}
          />
        </div>
      </Modal>

      <Modal open={!!incoming} onClose={() => setIncoming(null)} title="Replace what you're writing?">
        <p>You already have a letter in progress on this device. Opening the other one will replace it here.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              if (incoming) update({ ...incoming, serverId: incoming.serverId || undefined });
              setIncoming(null);
            }}
          >
            Replace it
          </Button>
          <Button variant="secondary" onClick={() => setIncoming(null)} data-autofocus>
            Keep what I'm writing
          </Button>
        </div>
      </Modal>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Start over?">
        <p>This deletes your draft from this device. It can't be undone.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              wipe();
              setConfirmClear(false);
            }}
          >
            Delete draft
          </Button>
          <Button variant="secondary" onClick={() => setConfirmClear(false)}>
            Keep writing
          </Button>
        </div>
      </Modal>
    </div>
  );
}
