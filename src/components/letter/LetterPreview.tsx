import { Postmark } from "@/components/Postmark";
import { longDate, shortDate } from "@/lib/dates";

/**
 * How the delivered email will look. Mirrors the HTML email template
 * (supabase/functions/_shared/email/letter.ts, Phase 5): same order, same postmark line.
 */
export function LetterPreview({
  subject,
  body,
  writtenOn,
  deliverOn,
  eventName,
}: {
  subject: string;
  body: string;
  writtenOn: Date;
  deliverOn: Date | null;
  eventName?: string;
}) {
  const paragraphs = body.trim() ? body.trim().split(/\n{2,}/) : [];
  return (
    <div className="bg-paper-deep px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[640px]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-b border-rule pb-4 text-sm">
          <dt className="text-pencil">From</dt>
          <dd>Your past self, via DearFutureMe</dd>
          <dt className="text-pencil">Subject</dt>
          <dd className="font-medium">{subject || "(no subject)"}</dd>
        </dl>

        <article className="sheet relative mt-6 px-6 pb-12 pt-8 md:px-12">
          <Postmark
            date={deliverOn ? shortDate(deliverOn) : "—"}
            waves={false}
            className="absolute right-4 top-4 w-20 rotate-12 md:w-28"
          />
          <p className="pr-24 font-serif text-sm text-pencil md:pr-32">{longDate(writtenOn)}</p>
          <div className="mt-8 space-y-[1.65em] font-serif text-base text-ink">
            {paragraphs.length ? (
              paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))
            ) : (
              <p className="text-pencil">Your letter will appear here.</p>
            )}
          </div>
        </article>

        <p className="mt-6 border-t border-dashed border-border pt-4 text-center font-sans text-xs uppercase tracking-[0.12em] text-pencil">
          {eventName ? `Written at ${eventName} on ` : "Written on "}
          {longDate(writtenOn)} · Delivered on {deliverOn ? longDate(deliverOn) : "the day you choose"}
        </p>
      </div>
    </div>
  );
}
