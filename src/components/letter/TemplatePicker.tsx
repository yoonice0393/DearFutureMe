import { useState } from "react";

import { Button } from "@/components/Button";
import { TEMPLATES, type Template } from "@/lib/prompts";

export function TemplatePicker({
  hasContent,
  onChoose,
  large = false,
}: {
  hasContent: boolean;
  onChoose: (t: Template) => void;
  large?: boolean;
}) {
  const [pending, setPending] = useState<Template | null>(null);

  return (
    <div>
      <h2 className="text-xl">Start from a template</h2>
      <p className="mt-2 text-pencil">Each one gives you a few opening lines. Change anything.</p>

      {pending && (
        <div role="alert" className="mt-6 border-l-4 border-postal bg-paper-deep px-6 py-4">
          <p>
            Using <strong>{pending.title}</strong> will replace what you've written so far.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => onChoose(pending)}>Replace my letter</Button>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Keep what I wrote
            </Button>
          </div>
        </div>
      )}

      <ul className="mt-6 divide-y divide-rule border-y border-rule">
        {TEMPLATES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => (hasContent ? setPending(t) : onChoose(t))}
              className={`flex w-full items-baseline justify-between gap-4 px-2 text-left hover:bg-paper-deep ${
                large ? "min-h-16 py-4" : "min-h-12 py-3"
              }`}
            >
              <span>
                <span className={`block font-serif text-ink ${large ? "text-xl" : "text-lg"}`}>{t.title}</span>
                <span className="mt-1 block text-sm text-pencil">{t.blurb}</span>
              </span>
              <span aria-hidden="true" className="text-postal">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
