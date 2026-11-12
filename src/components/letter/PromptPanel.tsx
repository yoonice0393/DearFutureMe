import { useMemo, useState } from "react";

import { THEMES, questionsFor, shuffled } from "@/lib/prompts";

const PER_PAGE = 3;

export function PromptPanel({ onInsert }: { onInsert: (text: string) => void }) {
  const [theme, setTheme] = useState<string>("mixed");
  const [page, setPage] = useState(0);
  const pool = useMemo(() => shuffled(questionsFor(theme)), [theme]);
  const pages = Math.max(1, Math.ceil(pool.length / PER_PAGE));
  const visible = pool.slice((page % pages) * PER_PAGE, (page % pages) * PER_PAGE + PER_PAGE);

  return (
    <section aria-labelledby="prompts-title" className="border-l-2 border-rule pl-6">
      <h2 id="prompts-title" className="text-lg">
        Not sure what to write?
      </h2>
      <p className="mt-2 text-sm text-pencil">Tap a question to add it to your letter.</p>

      <div role="group" aria-label="Theme" className="-mx-1 mt-4 flex flex-wrap gap-2">
        {[{ id: "mixed", label: "Anything" }, ...THEMES].map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={theme === t.id}
            onClick={() => {
              setTheme(t.id);
              setPage(0);
            }}
            className="min-h-12 rounded-sm border border-border px-3 text-xs text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
          >
            {t.label}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-3" aria-live="polite">
        {visible.map((q) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onInsert(q.text)}
              className="group flex min-h-12 w-full items-start gap-3 rounded-sm px-2 py-2 text-left font-serif text-base text-ink hover:bg-paper-deep"
            >
              <span aria-hidden="true" className="font-sans text-lg leading-7 text-postal">
                +
              </span>
              <span>
                <span className="sr-only">Add to letter: </span>
                {q.text}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setPage((p) => p + 1)}
        className="mt-4 inline-flex min-h-12 items-center text-sm text-postal underline underline-offset-4"
      >
        Show other questions
      </button>
    </section>
  );
}
