import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { defaultSubject } from "@shared/letter.ts";
import type { Delivery } from "@/lib/dates";
import { readJSON, removeKey, writeJSON } from "@/lib/storage";

export type Draft = {
  subject: string;
  body: string;
  delivery: Delivery | null;
  email: string;
  consent: boolean;
  /** ISO date the draft was started; shown at the top of the sheet. */
  startedAt: string;
};

export function emptyDraft(): Draft {
  const now = new Date();
  return {
    subject: defaultSubject(now),
    body: "",
    delivery: null,
    email: "",
    consent: false,
    startedAt: now.toISOString(),
  };
}

type Ctx = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
  /** Clear everything (after submit, idle timeout, or "start over"). */
  wipe: () => void;
  /** null when drafts are memory-only (booth mode). */
  storageKey: string | null;
  savedAt: Date | null;
};

const DraftCtx = createContext<Ctx | null>(null);

/**
 * Holds the letter being written.
 * - `storageKey` set: autosaves to localStorage (own device).
 * - `storageKey` null: memory only, nothing touches disk (booth mode).
 */
export function DraftProvider({
  storageKey,
  children,
}: {
  storageKey: string | null;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = storageKey ? readJSON<Draft>(storageKey) : null;
    // Never restore consent: it must be given fresh for each letter.
    return saved ? { ...emptyDraft(), ...saved, consent: false } : emptyDraft();
  });
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!storageKey) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const hasContent = draft.body.trim() || draft.email.trim();
      if (!hasContent) return;
      const { consent: _consent, ...persisted } = draft;
      if (writeJSON(storageKey, persisted)) setSavedAt(new Date());
    }, 600);
    return () => window.clearTimeout(timer.current);
  }, [draft, storageKey]);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const wipe = useCallback(() => {
    window.clearTimeout(timer.current);
    if (storageKey) removeKey(storageKey);
    setDraft(emptyDraft());
    setSavedAt(null);
  }, [storageKey]);

  const value = useMemo(
    () => ({ draft, update, wipe, storageKey, savedAt }),
    [draft, update, wipe, storageKey, savedAt],
  );
  return <DraftCtx.Provider value={value}>{children}</DraftCtx.Provider>;
}

export function useDraft(): Ctx {
  const ctx = useContext(DraftCtx);
  if (!ctx) throw new Error("useDraft must be used inside <DraftProvider>");
  return ctx;
}
