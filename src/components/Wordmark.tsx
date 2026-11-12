export function Wordmark() {
  return (
    <span className="inline-flex items-baseline gap-2 font-serif text-lg text-ink">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="h-6 w-6 self-center">
        <rect x="3" y="7" width="26" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3.5 8 16 18 28.5 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="18" r="4" className="fill-postal" />
      </svg>
      <span>
        Dear<span className="italic">Future</span>Me
      </span>
    </span>
  );
}
