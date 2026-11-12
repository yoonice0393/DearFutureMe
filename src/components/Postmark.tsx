import { useId } from "react";

/**
 * A circular postmark: place name around the rim, date in the middle,
 * with the wavy cancellation lines trailing off to the right.
 */
export function Postmark({
  date,
  place = "DEARFUTUREME · POST",
  className = "",
  waves = true,
}: {
  date: string;
  place?: string;
  className?: string;
  waves?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox={waves ? "0 0 220 120" : "0 0 120 120"}
      className={`text-postal ${className}`}
      role="img"
      aria-label={`Postmarked ${date}`}
    >
      <defs>
        <path id={`rim-${id}`} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.9">
        <circle cx="60" cy="60" r="56" />
        <circle cx="60" cy="60" r="34" strokeWidth="1.5" />
        {waves &&
          [36, 50, 64, 78].map((y) => (
            <path
              key={y}
              d={`M118 ${y} q 12 -8 24 0 t 24 0 t 24 0 t 24 0`}
              strokeWidth="2"
            />
          ))}
      </g>
      <text fill="currentColor" fontFamily="IBM Plex Sans, sans-serif" fontSize="10.5" letterSpacing="2.4" fontWeight="600">
        <textPath href={`#rim-${id}`}>{place}</textPath>
      </text>
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="IBM Plex Sans, sans-serif"
        fontSize="11"
        fontWeight="600"
        letterSpacing="0.5"
      >
        {date.toUpperCase()}
      </text>
    </svg>
  );
}
