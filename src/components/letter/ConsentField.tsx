import { useId, useState } from "react";
import { Link } from "react-router";

import { LegalModal, type LegalDoc } from "@/components/LegalModal";

/**
 * The consent checkbox. In booth/event mode (`inApp`) the Terms and Privacy
 * Policy open in a modal so nobody leaves the flow.
 */
export function ConsentField({
  checked,
  onChange,
  error,
  inApp = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string | null;
  inApp?: boolean;
}) {
  const id = useId();
  const [doc, setDoc] = useState<LegalDoc | null>(null);

  const docLink = (which: LegalDoc, label: string) =>
    inApp ? (
      <button
        type="button"
        onClick={() => setDoc(which)}
        className="inline-flex min-h-12 items-center font-medium text-postal underline underline-offset-4"
      >
        {label}
      </button>
    ) : (
      <Link to={`/${which}`} target="_blank" rel="noopener">
        {label}
        <span className="sr-only"> (opens in a new tab)</span>
      </Link>
    );

  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label="I agree to the Terms and Privacy Policy"
          aria-invalid={!!error}
          aria-describedby={`${id}-note ${id}-err`}
          className="mt-3 h-6 w-6 shrink-0 accent-[rgb(var(--c-postal))]"
        />
        <div>
          {/* Links/buttons inside a label keep their own behaviour; the full sentence is the checkbox's name. */}
          <label htmlFor={id} className="text-base">
            I agree to the {docLink("terms", "Terms")} and {docLink("privacy", "Privacy Policy")}.
          </label>
          <p id={`${id}-note`} className="text-sm text-pencil">
            We only use your email to deliver this letter.
          </p>
        </div>
      </div>
      <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-medium text-postal empty:hidden">
        {error ?? ""}
      </p>
      {inApp && <LegalModal doc={doc} onClose={() => setDoc(null)} />}
    </div>
  );
}
