import { Link } from "react-router";

import { Postmark } from "@/components/Postmark";
import { Stamp } from "@/components/Stamp";
import { countdown } from "@/lib/countdown";
import { longDate, shortDate } from "@/lib/dates";

const STATUS: Record<string, { label: string; tone: string } | undefined> = {
  pending_verification: { label: "Confirm your email to seal it", tone: "text-postal border-postal" },
  failed: { label: "Couldn't be delivered", tone: "text-postal border-postal" },
  sending: { label: "On its way now", tone: "text-stamp border-stamp" },
};

/** A sealed letter on the dashboard: an envelope with a postmark and a countdown. */
export function Envelope({
  id,
  status,
  writtenAt,
  deliverAt,
}: {
  id: string;
  status: string;
  writtenAt: string;
  deliverAt: string | null;
}) {
  const deliver = deliverAt ? new Date(deliverAt) : null;
  const chip = STATUS[status];
  const years = deliver ? Math.max(0, deliver.getFullYear() - new Date(writtenAt).getFullYear()) : 0;

  return (
    <Link
      to={`/letter/${id}`}
      className="group relative block aspect-[8/5] overflow-hidden border border-rule bg-paper-deep text-ink no-underline shadow-paper transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5"
    >
      {/* Flap */}
      <svg aria-hidden="true" viewBox="0 0 320 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d="M0 0 L160 92 L320 0" className="fill-none stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path d="M0 200 L128 110 M320 200 L192 110" className="fill-none stroke-rule" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <Postmark date={shortDate(new Date(writtenAt))} waves={false} className="absolute left-3 top-3 w-16 -rotate-12 opacity-80 md:w-20" />
      <Stamp label={years ? `${years} YR` : "SOON"} className="absolute right-3 top-3 w-10 rotate-3 md:w-12" />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
        {chip && (
          <span className={`mb-2 inline-block rounded-sm border bg-sheet px-2 py-0.5 text-xs font-medium ${chip.tone}`}>{chip.label}</span>
        )}
        <p className="font-serif text-lg leading-tight">
          {deliver ? (
            status === "failed" ? <>Was due {longDate(deliver)}</> : <>Opens in {countdown(deliver)}</>
          ) : (
            "No date yet"
          )}
        </p>
        {deliver && status !== "failed" && <p className="mt-1 text-xs text-pencil">{longDate(deliver)}</p>}
        <span className="sr-only">Written {longDate(new Date(writtenAt))}. Open to manage this letter.</span>
      </div>
    </Link>
  );
}
