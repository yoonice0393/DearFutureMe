import { useId } from "react";

/** A small postage stamp with a perforated edge. Decorative. */
export function Stamp({ label = "1 YR", className = "" }: { label?: string; className?: string }) {
  const id = `perf-${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 72 88" aria-hidden="true" className={className}>
      <defs>
        <mask id={id}>
          <rect width="72" height="88" fill="white" />
          {Array.from({ length: 9 }, (_, i) => (
            <g key={i}>
              <circle cx={4 + i * 8} cy="0" r="3" fill="black" />
              <circle cx={4 + i * 8} cy="88" r="3" fill="black" />
            </g>
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <g key={i}>
              <circle cx="0" cy={4 + i * 8} r="3" fill="black" />
              <circle cx="72" cy={4 + i * 8} r="3" fill="black" />
            </g>
          ))}
        </mask>
      </defs>
      <g mask={`url(#${id})`}>
        <rect width="72" height="88" className="fill-sheet" />
        <rect x="7" y="7" width="58" height="74" fill="none" strokeWidth="1.5" className="stroke-postal" />
        <path d="M14 62 q 11 -26 22 -10 t 22 -20" fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-stamp" />
        <circle cx="50" cy="26" r="6" className="fill-postal" />
        <text x="36" y="76" textAnchor="middle" fontSize="9" fontWeight="600" letterSpacing="1" fontFamily="IBM Plex Sans, sans-serif" className="fill-ink">
          {label}
        </text>
      </g>
    </svg>
  );
}
