import { useId, type ReactNode } from "react";

/** Label above, 8px gap, hint and error below. Errors are announced to screen readers. */
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-pencil">
          {hint}
        </p>
      )}
      <div className="mt-2">{children({ id, describedBy, invalid: !!error })}</div>
      <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-postal empty:hidden">
        {error ?? ""}
      </p>
    </div>
  );
}

export const inputClass =
  "block w-full min-h-12 rounded-sm border border-border bg-sheet px-4 py-2 text-base text-ink placeholder:text-pencil/80 aria-[invalid=true]:border-postal aria-[invalid=true]:border-2";
