import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { Wordmark } from "@/components/Wordmark";
import { clearKiosk, readKiosk, saveKiosk, DEV_KIOSK_TOKEN } from "@/features/booth/kiosk";
import { registerKiosk } from "@/lib/api";
import { usePageTitle } from "@/lib/usePageTitle";

/** Staff-only: register this device as a booth for an event (event code + staff PIN). */
export function BoothSetup() {
  usePageTitle("Booth setup");
  const navigate = useNavigate();
  const existing = readKiosk();
  const registered = existing && existing.token !== DEV_KIOSK_TOKEN ? existing : null;

  const [slug, setSlug] = useState("");
  const [pin, setPin] = useState("");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string | null> = {};
    if (!/^[a-z0-9][a-z0-9-]{2,39}$/.test(slug.trim().toLowerCase())) errs.slug = "Enter the event code staff were given, e.g. campus-fair-2026.";
    if (!/^\d{6,12}$/.test(pin)) errs.pin = "The staff PIN is 6 to 12 digits.";
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setBusy(true);
    const res = await registerKiosk(slug.trim().toLowerCase(), pin, label.trim() || undefined);
    setBusy(false);
    setPin(""); // never keep the PIN around
    if (!res.ok) {
      setErrors({ [res.field === "pin" ? "pin" : "form"]: res.error });
      return;
    }
    saveKiosk({ token: res.token, eventName: res.eventName ?? slug, label: label.trim() || undefined, registeredAt: new Date().toISOString() });
    navigate("/booth", { replace: true });
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[640px] px-4 py-12">
      <Wordmark />
      <h1 className="mt-12 text-2xl">Booth setup</h1>
      <p className="mt-4 text-pencil">For event staff. Registers this device so attendees can write letters without an account.</p>

      {registered && !removed && (
        <div className="mt-8 border-l-4 border-stamp bg-paper-deep px-6 py-4">
          <p>
            This device is registered for <strong className="font-semibold">{registered.eventName}</strong>
            {registered.label ? ` as “${registered.label}”` : ""}.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/booth" className="inline-flex min-h-12 items-center">Open the booth</Link>
            <Link to="/booth/qr" className="inline-flex min-h-12 items-center">Show the QR screen</Link>
            <Button
              variant="quiet"
              onClick={() => {
                clearKiosk();
                setRemoved(true);
              }}
            >
              Remove registration from this device
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-12 space-y-6">
        <Field label="Event code" error={errors.slug}>
          {({ id, describedBy, invalid }) => (
            <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={slug}
              onChange={(e) => setSlug(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder="campus-fair-2026" className={inputClass} />
          )}
        </Field>
        <Field label="Staff PIN" error={errors.pin}>
          {({ id, describedBy, invalid }) => (
            <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} type="password" inputMode="numeric"
              autoComplete="off" maxLength={12} className={inputClass} />
          )}
        </Field>
        <Field label="Device name (optional)" hint="Helps staff tell booths apart, e.g. “Tablet 2, left table”.">
          {({ id, describedBy }) => (
            <input id={id} aria-describedby={describedBy} value={label} maxLength={60}
              onChange={(e) => setLabel(e.target.value)} className={inputClass} />
          )}
        </Field>
        <p role="alert" className="text-sm font-medium text-postal empty:hidden">{errors.form ?? ""}</p>
        <Button type="submit" disabled={busy}>{busy ? "Registering…" : "Register this device"}</Button>
      </form>
    </div>
  );
}
