/**
 * "Sealing the envelope": the flap folds down, then the wax seal presses in.
 * CSS only, about 1s. Under prefers-reduced-motion the end state shows immediately
 * (handled globally in index.css).
 */
export function SealAnimation({ className = "" }: { className?: string }) {
  return (
    <div className={`seal-envelope relative aspect-[3/2] w-full max-w-[320px] ${className}`} aria-hidden="true">
      {/* Envelope back */}
      <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full">
        <rect x="0" y="60" width="300" height="140" className="fill-rule" />
      </svg>
      {/* Letter sliding in */}
      <div className="seal-letter absolute inset-x-[8%] top-[6%] h-[60%] bg-sheet shadow-paper">
        <div className="mx-[12%] mt-[14%] space-y-[8%]">
          <div className="h-0.5 w-3/4 bg-rule" />
          <div className="h-0.5 w-full bg-rule" />
          <div className="h-0.5 w-5/6 bg-rule" />
        </div>
      </div>
      {/* Envelope body */}
      <svg viewBox="0 0 300 200" className="absolute inset-0 h-full w-full">
        <path d="M0 60 L150 140 L300 60 V200 H0 Z" className="fill-paper-deep stroke-border" strokeWidth="1.5" />
        <path d="M0 200 L120 120 M300 200 L180 120" className="stroke-border" strokeWidth="1.5" />
      </svg>
      {/* Flap */}
      <svg viewBox="0 0 300 200" className="seal-flap absolute inset-0 h-full w-full">
        <path d="M0 60 L150 140 L300 60 Z" className="fill-paper-deep stroke-border" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      {/* Wax seal */}
      <div className="seal-wax absolute left-1/2 top-[70%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-postal font-serif text-xl italic text-on-postal shadow-paper">
        F
      </div>
    </div>
  );
}
