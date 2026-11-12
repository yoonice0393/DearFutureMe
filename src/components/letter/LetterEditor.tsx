import { useEffect, useId, useLayoutEffect, type RefObject } from "react";

import { LETTER_MAX_CHARS, SUBJECT_MAX_CHARS } from "@shared/letter.ts";
import { useDraft } from "@/features/draft/DraftContext";
import { longDate } from "@/lib/dates";

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Insert text at the caret (or append), then put the caret after it. */
export function insertAtCursor(
  el: HTMLTextAreaElement | null,
  current: string,
  text: string,
  set: (v: string) => void,
) {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const before = current.slice(0, start);
  const after = current.slice(end);
  const lead = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
  const insert = `${lead}${text}\n`;
  const next = (before + insert + after).slice(0, LETTER_MAX_CHARS);
  set(next);
  requestAnimationFrame(() => {
    if (!el) return;
    const pos = Math.min(before.length + insert.length, next.length);
    el.focus();
    el.setSelectionRange(pos, pos);
  });
}

function autosize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

export function LetterEditor({
  textareaRef,
  large = false,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  large?: boolean;
}) {
  const { draft, update, savedAt, storageKey } = useDraft();
  const id = useId();
  const words = countWords(draft.body);
  const chars = draft.body.length;
  const nearLimit = chars > LETTER_MAX_CHARS * 0.8;

  useLayoutEffect(() => autosize(textareaRef.current), [draft.body, textareaRef]);
  useEffect(() => {
    const onResize = () => autosize(textareaRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [textareaRef]);

  return (
    <div>
      <div className="sheet px-6 pb-8 pt-6 focus-within:shadow-[0_0_0_2px_rgb(var(--c-postal)/0.55)] md:px-12 md:pb-12 md:pt-8">
        <p className="text-right font-serif text-sm text-pencil">{longDate(new Date(draft.startedAt))}</p>

        <label htmlFor={`${id}-subject`} className="eyebrow mt-4 block">
          Subject
        </label>
        <input
          id={`${id}-subject`}
          value={draft.subject}
          maxLength={SUBJECT_MAX_CHARS}
          onChange={(e) => update({ subject: e.target.value })}
          className="mt-2 block min-h-12 w-full border-0 border-b border-rule bg-transparent px-0 font-serif text-lg text-ink focus:border-postal focus:outline-none"
        />

        <label htmlFor={`${id}-body`} className="sr-only">
          Your letter
        </label>
        <textarea
          id={`${id}-body`}
          ref={textareaRef}
          value={draft.body}
          maxLength={LETTER_MAX_CHARS}
          onChange={(e) => update({ body: e.target.value })}
          placeholder={"Dear future me,\n\n"}
          spellCheck
          autoCapitalize="sentences"
          aria-describedby={`${id}-count`}
          rows={large ? 10 : 14}
          className={`ruled mt-6 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-serif text-ink placeholder:text-pencil/70 focus:outline-none ${
            large ? "text-lg" : "text-base"
          }`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-pencil">
        <p id={`${id}-count`} aria-live="polite" aria-atomic="true">
          {words.toLocaleString("en")} {words === 1 ? "word" : "words"}
          {nearLimit && (
            <span className={chars >= LETTER_MAX_CHARS ? "font-medium text-postal" : ""}>
              {" "}· {(LETTER_MAX_CHARS - chars).toLocaleString("en")} characters left
            </span>
          )}
        </p>
        {storageKey ? (
          <p>{savedAt ? `Draft saved on this device at ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Drafts save on this device as you type"}</p>
        ) : (
          <p>Nothing is saved on this device.</p>
        )}
      </div>
    </div>
  );
}
