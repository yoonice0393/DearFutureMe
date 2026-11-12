import { useState } from "react";

import { Field, inputClass } from "@/components/Field";
import { suggestEmail } from "@/lib/mailcheck";

export function EmailField({
  value,
  onChange,
  error,
  large = false,
  label = "Your email address",
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  large?: boolean;
  label?: string;
}) {
  const [checked, setChecked] = useState(value);
  // Suggest after the person leaves the field (or pauses with a full domain).
  const suggestion = checked ? suggestEmail(checked) : null;

  return (
    <Field label={label} hint="We'll send your receipt here now, and your letter on the day." error={error}>
      {({ id, describedBy, invalid }) => (
        <>
          <input
            id={id}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            value={value}
            aria-invalid={invalid}
            aria-describedby={[describedBy, suggestion ? `${id}-suggest` : null].filter(Boolean).join(" ") || undefined}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => setChecked(value)}
            placeholder="name@example.com"
            className={`${inputClass} ${large ? "min-h-16 text-xl" : "text-lg"}`}
          />
          <div aria-live="polite">
            {suggestion && (
              <p id={`${id}-suggest`} className="mt-3 flex flex-wrap items-center gap-x-2 text-base">
                <span>
                  Did you mean <strong className="font-semibold">{suggestion}</strong>?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onChange(suggestion);
                    setChecked(suggestion);
                  }}
                  className="inline-flex min-h-12 items-center px-2 font-medium text-postal underline underline-offset-4"
                >
                  Yes, use that
                </button>
              </p>
            )}
          </div>
        </>
      )}
    </Field>
  );
}
