import { useEffect, useState } from "react";

import { emailSchema } from "@shared/letter.ts";
import { Button, ButtonLink } from "@/components/Button";
import { ConsentField } from "@/components/letter/ConsentField";
import { DeliveryPicker } from "@/components/letter/DeliveryPicker";
import { EmailField } from "@/components/letter/EmailField";
import { ReviewEmail } from "@/components/letter/ReviewEmail";
import { SealAnimation } from "@/components/letter/SealAnimation";
import { POLICY_VERSION } from "@/config";
import { useAuth } from "@/features/auth/AuthContext";
import { useDraft } from "@/features/draft/DraftContext";
import { submitLetter } from "@/lib/api";
import { customDateError, longDate, resolveDelivery, userTimezone } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

type Done = { email: string; arrives: string; status: "sealed" | "pending_verification" };

export function Schedule() {
  usePageTitle("Choose a delivery date");
  const { draft, update, wipe } = useDraft();
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const deliverAt = resolveDelivery(draft.delivery);
  const setField = (key: string, patch: Parameters<typeof update>[0]) => {
    update(patch);
    setErrors((e) => (e[key] ? { ...e, [key]: null } : e));
  };
  // Signed in? Start with the account address (they can still change it).
  const { email: accountEmail } = useAuth();
  useEffect(() => {
    if (accountEmail && !draft.email) update({ email: accountEmail });
  }, [accountEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return <Submitted done={done} />;

  if (!draft.body.trim()) {
    return (
      <div className="mx-auto max-w-page px-4 py-14 md:px-8 md:py-24">
        <h1 className="text-2xl">There's no letter yet.</h1>
        <p className="mt-4 text-pencil">Write your letter first, then choose when it arrives.</p>
        <ButtonLink to="/write" className="mt-8">
          Write your letter
        </ButtonLink>
      </div>
    );
  }

  function review() {
    const e: Record<string, string | null> = {};
    if (!draft.delivery) e.when = "Choose when your letter should arrive.";
    else if (draft.delivery.kind === "custom") e.when = customDateError(draft.delivery.date);
    const r = emailSchema.safeParse(draft.email);
    if (!r.success) e.email = r.error.issues[0].message;
    else update({ email: r.data });
    if (!draft.consent) e.consent = "Please agree to the Terms and Privacy Policy.";
    setErrors(e);
    if (!Object.values(e).some(Boolean)) setReviewing(true);
  }

  async function seal() {
    if (!deliverAt) return setReviewing(false);
    setBusy(true);
    const res = await submitLetter({
      subject: draft.subject,
      body: draft.body,
      email: draft.email,
      deliverAt: deliverAt.toISOString(),
      timezone: userTimezone(),
      consent: true,
      policyVersion: POLICY_VERSION,
      draftId: draft.serverId,
    });
    setBusy(false);
    if (!res.ok) return setErrors({ review: res.error });
    const result: Done = { email: draft.email, arrives: longDate(new Date(res.deliverAt)), status: res.status };
    wipe();
    setDone(result);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="mx-auto max-w-page px-4 pb-12 pt-8 md:px-8 md:pt-12">
      <p className="eyebrow">Step 2 of 2</p>
      {reviewing ? (
        <div className="mt-6 max-w-[720px]">
          <ReviewEmail
            email={draft.email}
            arrives={deliverAt ? longDate(deliverAt) : ""}
            onEdit={() => setReviewing(false)}
            onConfirm={seal}
            busy={busy}
            error={errors.review}
          />
        </div>
      ) : (
        <>
          <h1 className="mt-3 text-2xl md:text-3xl">Seal it and send it forward</h1>
          <form
            noValidate
            className="mt-12 max-w-[720px] space-y-12"
            onSubmit={(e) => {
              e.preventDefault();
              review();
            }}
          >
            <DeliveryPicker value={draft.delivery} onChange={(d) => setField("when", { delivery: d })} error={errors.when} />
            <div className="space-y-6 border-t border-rule pt-12">
              <EmailField value={draft.email} onChange={(email) => setField("email", { email })} error={errors.email} />
              <ConsentField checked={draft.consent} onChange={(consent) => setField("consent", { consent })} error={errors.consent} />
              {/* Turnstile widget goes here (Phase 7). */}
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-6">
              <Button type="submit">Review and seal</Button>
              <ButtonLink to="/write" variant="quiet">
                Back to my letter
              </ButtonLink>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function Submitted({ done }: { done: Done }) {
  const pending = done.status === "pending_verification";
  return (
    <div className="mx-auto max-w-page px-4 py-14 md:px-8 md:py-24">
      <div className="max-w-[640px]">
        <SealAnimation />
        <h1 className="mt-12 text-2xl md:text-3xl">{pending ? "One last step: check your inbox." : "Your letter is sealed."}</h1>
        {pending ? (
          <p className="mt-6 text-lg">
            We've sent a link to <strong className="[overflow-wrap:anywhere] font-semibold">{done.email}</strong>. Click
            it to confirm the address and your letter will be sealed for{" "}
            <strong className="font-semibold">{done.arrives}</strong>. The link expires in 24 hours.
          </p>
        ) : (
          <p className="mt-6 text-lg">
            It arrives on <strong className="font-semibold">{done.arrives}</strong>. We've sent a receipt to{" "}
            <strong className="[overflow-wrap:anywhere] font-semibold">{done.email}</strong>.
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/write" variant="secondary">
            Write another letter
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
