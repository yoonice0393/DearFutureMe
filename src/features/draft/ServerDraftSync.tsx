import { useEffect, useRef } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { useDraft } from "@/features/draft/DraftContext";
import { saveDraft } from "@/lib/api";

const DEBOUNCE_MS = 3000;

/**
 * When signed in, mirrors the local draft to the account (encrypted server-side).
 * Saves are chained so a slow first save can't create a second draft.
 */
export function ServerDraftSync() {
  const { session } = useAuth();
  const { draft, update } = useDraft();
  const latest = useRef(draft);
  latest.current = draft;
  const savedKey = useRef("");
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!session || !draft.body.trim()) return;
    const key = `${draft.subject}\u0000${draft.body}`;
    if (key === savedKey.current) return;

    const t = window.setTimeout(() => {
      queue.current = queue.current.then(async () => {
        const d = latest.current;
        const k = `${d.subject}\u0000${d.body}`;
        if (k === savedKey.current || !d.body.trim()) return;
        const res = await saveDraft({ id: d.serverId, subject: d.subject, body: d.body });
        if (res.ok) {
          savedKey.current = k;
          if (res.id !== latest.current.serverId) update({ serverId: res.id });
        } else if (res.code === "not_found") {
          update({ serverId: undefined }); // deleted elsewhere: next save creates a new one
        }
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [session, draft.subject, draft.body, update]);

  return null;
}
