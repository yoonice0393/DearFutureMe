import { useEffect, useRef, useState } from "react";

import { useDraft } from "@/features/draft/DraftContext";
import { GuidedFlow } from "./GuidedFlow";
import { LetterEditor, insertAtCursor } from "./LetterEditor";
import { PromptPanel } from "./PromptPanel";
import { TemplatePicker } from "./TemplatePicker";

type Mode = "free" | "guided" | "templates";
const MODES: { id: Mode; label: string }[] = [
  { id: "free", label: "Free write" },
  { id: "guided", label: "Guided questions" },
  { id: "templates", label: "Templates" },
];

/** Free-write / Guided / Templates, all writing into the same draft. */
export function Composer({ large = false }: { large?: boolean }) {
  const { draft, update } = useDraft();
  const [mode, setMode] = useState<Mode>("free");
  const [showPrompts, setShowPrompts] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const setBody = (body: string) => update({ body });
  const insert = (text: string) => insertAtCursor(textareaRef.current, draft.body, text, setBody);

  // After guided/templates hand back a letter, focus the editor once it has mounted.
  const focusOnFree = useRef(false);
  const focusEditor = () => {
    focusOnFree.current = true;
  };
  useEffect(() => {
    if (mode === "free" && focusOnFree.current) {
      focusOnFree.current = false;
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [mode]);

  return (
    <div>
      <div role="tablist" aria-label="How do you want to write?" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-rule [scrollbar-width:none]">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            type="button"
            id={`tab-${m.id}`}
            aria-selected={mode === m.id}
            aria-controls={`panel-${m.id}`}
            onClick={() => setMode(m.id)}
            className={`-mb-px min-h-12 shrink-0 border-b-2 px-2 text-sm sm:px-4 ${
              mode === m.id ? "border-postal font-medium text-ink" : "border-transparent text-pencil hover:text-ink"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${mode}`} aria-labelledby={`tab-${mode}`} className="pt-8">
        {mode === "free" && (
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <LetterEditor textareaRef={textareaRef} large={large} />
            </div>
            <div className="lg:col-span-4">
              <button
                type="button"
                aria-expanded={showPrompts}
                onClick={() => setShowPrompts((s) => !s)}
                className="inline-flex min-h-12 items-center gap-2 text-sm text-postal underline underline-offset-4 lg:hidden"
              >
                {showPrompts ? "Hide question ideas" : "Not sure what to write? Get a question"}
              </button>
              <div className={`${showPrompts ? "mt-4 block" : "hidden"} lg:mt-0 lg:block`}>
                <PromptPanel onInsert={insert} />
              </div>
            </div>
          </div>
        )}

        {mode === "guided" && (
          <div className="max-w-[720px]">
            <GuidedFlow
              large={large}
              onDone={(body) => {
                setBody(draft.body.trim() ? `${draft.body.trim()}\n\n${body}` : body);
                setMode("free");
                focusEditor();
              }}
            />
          </div>
        )}

        {mode === "templates" && (
          <div className="max-w-[720px]">
            <TemplatePicker
              large={large}
              hasContent={!!draft.body.trim()}
              onChoose={(t) => {
                setBody(t.body);
                setMode("free");
                focusEditor();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
