import { useEffect, useRef, useState, type ReactNode } from "react";

import { emailSchema, letterContentSchema } from "@shared/letter.ts";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Composer } from "@/components/letter/Composer";
import { ConsentField } from "@/components/letter/ConsentField";
import { DeliveryPicker } from "@/components/letter/DeliveryPicker";
import { EmailField } from "@/components/letter/EmailField";
import { LetterPreview } from "@/components/letter/LetterPreview";
import { ReviewEmail } from "@/components/letter/ReviewEmail";
import { SealAnimation } from "@/components/letter/SealAnimation";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import { POLICY_VERSION } from "@/config";
import { useDraft } from "@/features/draft/DraftContext";
import { submitLetter } from "@/lib/api";
import { customDateError, longDate, resolveDelivery, userTimezone } from "@/lib/dates";

export type Step = "write" | "when" | "email" | "review" | "sealed";
const ORDER: Step[] = ["write", "when", "email", "review"];
const LABELS: Record<Step, string> = {
  write: "Write",
  when: "Delivery date",
  email: "Your email",
  review: "Check",
  sealed: "Sealed",
};

export type Sealed = { email: string; arrives: string };

/**
 * Write → when → email → review → sealed, without account or verification.
 * Used by the booth (memory-only draft) and by attendees' phones (/e/:code).
 * Steps are component state, never URL history, so Back can't reveal a letter.
 */
export function LetterFlow({
  mode,
  kioskToken,
  eventCode,
  eventName,
  renderSealed,
}: {
  mode: "booth" | "event";
  kioskToken?: string;
  eventCode?: string;
  eventName?: string;
  renderSealed: (s: Sealed) => ReactNode;
}) {
  const { draft, update, wipe } = useDraft();
  const [step, setStep] = useState<Step>("write");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [botToken, setBotToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const large = mode === "booth";

  // Move focus to the step heading and scroll up on every step change.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, [step]);

  const deliverAt = resolveDelivery(draft.delivery);
  const setField = (key: string, patch: Parameters<typeof update>[0]) => {
    update(patch);
    setErrors((e) => (e[key] ? { ...e, [key]: null } : e));
  };
  // The write-step error clears as soon as they start writing.
  useEffect(() => {
    setErrors((e) => (e.write ? { ...e, write: null } : e));
  }, [draft.body]);

  function next() {
    const e: Record<string, string | null> = {};
    if (step === "write") {
      const r = letterContentSchema.safeParse({ subject: draft.subject, body: draft.body });
      if (!r.success) e.write = r.error.issues[0].message;
    }
    if (step === "when") {
      if (!draft.delivery) e.when = "Choose when your letter should arrive.";
      else if (draft.delivery.kind === "custom") e.when = customDateError(draft.delivery.date);
    }
    if (step === "email") {
      const r = emailSchema.safeParse(draft.email);
      if (!r.success) e.email = r.error.issues[0].message;
      else update({ email: r.data });
      if (!draft.consent) e.consent = "Please agree to the Terms and Privacy Policy.";
    }
    setErrors(e);
    if (Object.values(e).some(Boolean)) return;
    setStep(ORDER[ORDER.indexOf(step) + 1]);
  }

  function back() {
    setErrors({});
    setStep(ORDER[Math.max(0, ORDER.indexOf(step) - 1)]);
  }

  async function seal() {
    if (!deliverAt) return setStep("when");
    setBusy(true);
    setErrors({});
    const res = await submitLetter({
      subject: draft.subject,
      body: draft.body,
      email: draft.email,
      deliverAt: deliverAt.toISOString(),
      timezone: userTimezone(),
      consent: draft.consent as true,
      policyVersion: POLICY_VERSION,
      kioskToken,
      eventCode,
      // Phones at events get an invisible Turnstile check; booth devices skip it.
      turnstileToken: botToken ?? undefined,
    });
    setBusy(false);
    turnstile.current?.reset();
    if (!res.ok) {
      setErrors({ review: res.error });
      return;
    }
    const result = { email: draft.email, arrives: longDate(new Date(res.deliverAt)) };
    wipe(); // the letter leaves this device's memory/storage right away
    setSealed(result);
    setStep("sealed");
  }

  if (step === "sealed" && sealed) {
    return (
      <div className="mx-auto max-w-[640px] py-8 text-left md:py-16">
        <SealAnimation />
        <h1 ref={headingRef} tabIndex={-1} className="mt-12 text-2xl focus:outline-none md:text-3xl">
          Your letter is sealed.
        </h1>
        {renderSealed(sealed)}
      </div>
    );
  }

  const stepIndex = ORDER.indexOf(step);
  return (
    <div>
      {mode === "event" && <Turnstile ref={turnstile} onToken={setBotToken} action="event" />}
      <ol aria-label="Steps" className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.12em]">
        {ORDER.map((s, i) => (
          <li key={s} aria-current={s === step ? "step" : undefined} className={i === stepIndex ? "font-semibold text-postal" : i < stepIndex ? "text-ink" : "text-pencil"}>
            {i + 1}. {LABELS[s]}
          </li>
        ))}
      </ol>

      {step === "write" && (
        <section className="mt-8">
          <h1 ref={headingRef} tabIndex={-1} className={`focus:outline-none ${large ? "text-3xl" : "text-2xl"}`}>
            Dear future me…
          </h1>
          <p className="mt-3 max-w-prose text-pencil">Write freely, answer a few questions, or start from a template.</p>
          <div className="mt-8">
            <Composer large={large} />
          </div>
          <p role="alert" className="mt-4 text-base font-medium text-postal empty:hidden">
            {errors.write ?? ""}
          </p>
          <StepNav onNext={next} nextLabel="Next: choose a date">
            <Button variant="secondary" className="min-h-14 px-8 text-base" onClick={() => setPreview(true)}>
              Preview
            </Button>
          </StepNav>
          <Modal open={preview} onClose={() => setPreview(false)} title="Preview" wide>
            <div className="-mx-6 -my-6">
              <LetterPreview
                subject={draft.subject}
                body={draft.body}
                writtenOn={new Date(draft.startedAt)}
                deliverOn={deliverAt}
                eventName={eventName}
              />
            </div>
          </Modal>
        </section>
      )}

      {step === "when" && (
        <section className="mt-8 max-w-[720px]">
          <h1 ref={headingRef} tabIndex={-1} className="sr-only focus:outline-none">
            Choose a delivery date
          </h1>
          <DeliveryPicker
            value={draft.delivery}
            onChange={(d) => setField("when", { delivery: d })}
            large={large}
            error={errors.when}
          />
          <StepNav onNext={next} onBack={back} nextLabel="Next: your email" />
        </section>
      )}

      {step === "email" && (
        <section className="mt-8 max-w-[640px]">
          <h1 ref={headingRef} tabIndex={-1} className={`focus:outline-none ${large ? "text-2xl" : "text-xl"}`}>
            Where should we send it?
          </h1>
          <p className="mt-3 text-pencil">No account needed. We'll email you a receipt right away with a link to cancel.</p>
          <form
            className="mt-8 space-y-6"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <EmailField value={draft.email} onChange={(email) => setField("email", { email })} error={errors.email} large={large} />
            <ConsentField checked={draft.consent} onChange={(consent) => setField("consent", { consent })} error={errors.consent} inApp />
            <StepNav onBack={back} nextLabel="Review" submit />
          </form>
        </section>
      )}

      {step === "review" && (
        <section className="mt-8 max-w-[720px]">
          <h1 ref={headingRef} tabIndex={-1} className="sr-only focus:outline-none">
            Check your email address
          </h1>
          <ReviewEmail
            email={draft.email}
            arrives={deliverAt ? longDate(deliverAt) : ""}
            onEdit={() => setStep("email")}
            onConfirm={seal}
            busy={busy}
            error={errors.review}
          />
        </section>
      )}
    </div>
  );
}

function StepNav({
  onNext,
  onBack,
  nextLabel,
  submit = false,
  children,
}: {
  onNext?: () => void;
  onBack?: () => void;
  nextLabel: string;
  submit?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-rule pt-6">
      <Button type={submit ? "submit" : "button"} onClick={submit ? undefined : onNext} className="min-h-14 px-8 text-base">
        {nextLabel}
      </Button>
      {children}
      {onBack && (
        <Button variant="quiet" onClick={onBack} className="min-h-14">
          Back
        </Button>
      )}
    </div>
  );
}
