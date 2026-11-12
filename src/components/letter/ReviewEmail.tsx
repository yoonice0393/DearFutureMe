import { useEffect, useRef } from "react";

import { Button } from "@/components/Button";

/** Final check: the address in large type, with Edit / Yes. */
export function ReviewEmail({
  email,
  arrives,
  onEdit,
  onConfirm,
  busy = false,
  error,
}: {
  email: string;
  arrives: string;
  onEdit: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string | null;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  const at = email.lastIndexOf("@");
  return (
    <section aria-labelledby="review-title">
      <h2 id="review-title" ref={headingRef} tabIndex={-1} className="text-xl focus:outline-none md:text-2xl">
        We'll send it to
      </h2>
      <p className="mt-6 [overflow-wrap:anywhere] border-y-2 border-dashed border-rule py-6 font-serif text-2xl text-ink md:text-3xl">
        {at > 0 ? (
          <>
            {email.slice(0, at)}
            <span className="text-postal">@{email.slice(at + 1)}</span>
          </>
        ) : (
          email
        )}
      </p>
      <p className="mt-6 text-lg">
        on <strong className="font-semibold">{arrives}</strong>. Is that right?
      </p>

      <p role="alert" className="mt-4 text-base font-medium text-postal empty:hidden">
        {error ?? ""}
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={onConfirm} disabled={busy} className="min-h-14 px-8 text-base">
          {busy ? "Sealing…" : "Yes, seal my letter"}
        </Button>
        <Button variant="secondary" onClick={onEdit} disabled={busy} className="min-h-14 px-8 text-base">
          Edit
        </Button>
      </div>
    </section>
  );
}
