import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native <dialog>: focus trapping, Escape to close and inert background for free.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  dismissable = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal() focuses the first control (the close button); honour an explicit choice.
      el.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        if (dismissable) onClose();
      }}
      onClick={(e) => {
        if (dismissable && e.target === ref.current) onClose();
      }}
      className={`m-auto w-[calc(100%-32px)] ${wide ? "max-w-[760px]" : "max-w-[520px]"} max-h-[calc(100dvh-64px)] rounded-sm bg-paper p-0 text-ink shadow-paper backdrop:bg-ink/50`}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-64px)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-4">
            <h2 id="modal-title" className="text-xl">
              {title}
            </h2>
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-3 inline-flex h-12 w-12 shrink-0 items-center justify-center text-pencil hover:text-ink"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
          <div className="overflow-y-auto px-6 py-6">{children}</div>
        </div>
      )}
    </dialog>
  );
}
