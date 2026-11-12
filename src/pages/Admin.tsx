import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router";

import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { adminCreateEvent, adminOverview, adminPauseEvent, adminRetryFailed, adminRevokeKiosk, type AdminOverview } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { usePageTitle } from "@/lib/usePageTitle";

const dt = (s: string) => new Date(s).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** Staff only. Counts and controls, never letter content or email addresses. */
export function Admin() {
  usePageTitle("Staff");
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoke, setRevoke] = useState<{ id: string; label: string; cancel: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await adminOverview();
    if (r.ok) setData(r);
    else setError(r.error);
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    supabase.from("profiles").select("role").single().then(({ data: p }) => {
      const admin = p?.role === "admin";
      setIsAdmin(admin);
      if (admin) load();
    });
  }, [session, load]);

  if (loading) return <p className="mx-auto max-w-page px-4 py-24 text-pencil md:px-8">Loading…</p>;
  if (!session) return <Navigate to="/signin" replace />;
  if (isAdmin === false) {
    return (
      <div className="mx-auto max-w-page px-4 py-24 md:px-8">
        <h1 className="text-2xl">This page is for DearFutureMe staff.</h1>
      </div>
    );
  }

  const q = data?.queue ?? {};
  const stat = (label: string, n: number | undefined, warn = false) => (
    <div className="border-t-2 border-ink pt-3">
      <dt className="text-sm text-pencil">{label}</dt>
      <dd className={`font-serif text-2xl ${warn && n ? "text-postal" : ""}`}>{n ?? 0}</dd>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Staff" title="Events and delivery">
        <p>Counts and controls only. Letter content and email addresses are never shown here.</p>
      </PageHeader>
      <div className="mx-auto max-w-page space-y-16 px-4 md:px-8">
        {error && <p role="alert" className="font-medium text-postal">{error}</p>}

        <section aria-labelledby="a-queue">
          <h2 id="a-queue" className="text-xl">Delivery queue</h2>
          <dl className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {stat("Sealed, waiting", q.sealed)}
            {stat("Awaiting email confirmation", q.pending_verification)}
            {stat("Delivered", q.delivered)}
            {stat("Failed", q.failed, true)}
            {stat("Emails queued", q.outbox_queued)}
            {stat("Emails failed", q.outbox_failed, true)}
          </dl>
          <p className="mt-4 text-sm text-pencil">
            Sent today:{" "}
            {data?.quotaToday.length ? data.quotaToday.map((p) => `${p.provider} ${p.used}`).join(", ") : "none"} (Brevo free limit: 300/day)
          </p>

          {!!data?.failed.length && (
            <div className="mt-8">
              <h3 className="text-lg">Failed letters</h3>
              <p className="mt-1 text-sm text-pencil">
                If the error says a send was interrupted, check the Brevo log first, because the email may have gone out.
              </p>
              <ul className="mt-4 divide-y divide-rule border-y border-rule">
                {data.failed.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="font-medium">Due {longDate(new Date(f.deliver_at))}</span> · {f.source} · {f.attempts} attempts
                      <span className="block text-pencil">{f.last_error ?? "No error recorded"}</span>
                    </span>
                    <Button variant="secondary" onClick={async () => { await adminRetryFailed(f.id); load(); }}>Retry</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="a-events">
          <h2 id="a-events" className="text-xl">Events</h2>
          {!data?.events.length && <p className="mt-4 text-pencil">No events yet.</p>}
          <div className="mt-6 space-y-8">
            {data?.events.map((e) => {
              const live = !e.paused && Date.parse(e.starts_at) <= Date.now() && Date.now() <= Date.parse(e.ends_at);
              const kiosks = data.kiosks.filter((k) => k.event_id === e.event_id);
              return (
                <article key={e.event_id} className="sheet px-6 py-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg">{e.name}</h3>
                      <p className="text-sm text-pencil">
                        Code <code className="font-mono text-ink">{e.slug}</code> · {dt(e.starts_at)} – {dt(e.ends_at)} ·{" "}
                        <span className={live ? "font-medium text-stamp" : e.paused ? "font-medium text-postal" : ""}>
                          {e.paused ? "Paused" : live ? "Live" : Date.now() < Date.parse(e.starts_at) ? "Upcoming" : "Ended"}
                        </span>
                      </p>
                    </div>
                    <Button variant="secondary" onClick={async () => { await adminPauseEvent(e.event_id, !e.paused); load(); }}>
                      {e.paused ? "Resume event" : "Pause event"}
                    </Button>
                  </div>
                  <p className="mt-4">
                    <strong className="font-semibold">{e.letters}</strong> of {e.submission_cap} letters · booth {e.booth} · phones {e.phone} (printed QR {e.via_static} of {e.static_code_cap})
                  </p>
                  <h4 className="mt-6 text-sm font-semibold">Booth devices</h4>
                  {kiosks.length ? (
                    <ul className="mt-2 divide-y divide-rule border-y border-rule text-sm">
                      {kiosks.map((k) => (
                        <li key={k.kiosk_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                          <span>
                            {k.label ?? "Unnamed device"} · {k.letters} letters ·{" "}
                            {k.active ? <span className="text-stamp">active</span> : <span className="text-postal">revoked {k.revoked_at ? dt(k.revoked_at) : ""}</span>}
                          </span>
                          {k.active && (
                            <Button variant="quiet" onClick={() => setRevoke({ id: k.kiosk_id, label: k.label ?? "this device", cancel: false })}>
                              Revoke
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-pencil">None registered. Use /booth/setup on each device.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <CreateEvent onCreated={load} />
      </div>

      <Modal open={!!revoke} onClose={() => setRevoke(null)} title={`Revoke ${revoke?.label ?? ""}?`}>
        <p>The device stops accepting letters immediately. Staff can register it again with the PIN.</p>
        <label className="mt-6 flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-6 w-6 accent-[rgb(var(--c-postal))]" checked={revoke?.cancel ?? false}
            onChange={(e) => setRevoke((r) => (r ? { ...r, cancel: e.target.checked } : r))} />
          <span>Also cancel and delete every letter this device submitted that hasn't been delivered (for abuse).</span>
        </label>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={busy} onClick={async () => {
            if (!revoke) return;
            setBusy(true);
            await adminRevokeKiosk(revoke.id, revoke.cancel);
            setBusy(false);
            setRevoke(null);
            load();
          }}>Revoke device</Button>
          <Button variant="secondary" onClick={() => setRevoke(null)} data-autofocus>Keep it active</Button>
        </div>
      </Modal>
    </>
  );
}

function CreateEvent({ onCreated }: { onCreated: () => void }) {
  const [f, setF] = useState({ name: "", slug: "", starts: "", ends: "", pin: "", cap: "300", staticCap: "100" });
  const [err, setErr] = useState<{ field?: string; text: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { setF({ ...f, [k]: e.target.value }); setErr(null); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.starts || !f.ends) return setErr({ field: "starts", text: "Set when the event starts and ends." });
    const r = await adminCreateEvent({
      name: f.name, slug: f.slug, pin: f.pin,
      startsAt: new Date(f.starts).toISOString(), endsAt: new Date(f.ends).toISOString(),
      cap: Number(f.cap), staticCap: Number(f.staticCap),
    });
    if (!r.ok) return setErr({ field: r.field, text: r.error });
    setDone(`Created “${f.name}”. Staff register booths at /booth/setup with code ${f.slug} and the PIN.`);
    setF({ name: "", slug: "", starts: "", ends: "", pin: "", cap: "300", staticCap: "100" });
    onCreated();
  }

  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <Field label={label} hint={hint} error={err?.field === k ? err.text : null}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={f[k]} onChange={set(k)} className={inputClass} {...props} />
      )}
    </Field>
  );

  return (
    <section aria-labelledby="a-create" className="max-w-[720px]">
      <h2 id="a-create" className="text-xl">Create an event</h2>
      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">{input("name", "Event name", { maxLength: 120 }, "Shown in the delivered email: “Written at … on …”")}</div>
        {input("slug", "Event code", { placeholder: "campus-fair-2026", autoCapitalize: "none" }, "Staff type this on each booth device.")}
        {input("pin", "Staff PIN", { inputMode: "numeric", type: "password", autoComplete: "new-password", maxLength: 12 }, "6–12 digits. Share only with booth staff.")}
        {input("starts", "Starts", { type: "datetime-local" })}
        {input("ends", "Ends", { type: "datetime-local" })}
        {input("cap", "Letter limit for the event", { type: "number", min: 1 }, "Brevo's free plan sends 300 emails a day.")}
        {input("staticCap", "Limit for the printed QR", { type: "number", min: 0 })}
        <p role="alert" className="text-sm font-medium text-postal empty:hidden sm:col-span-2">{err && !["name", "slug", "pin", "starts", "ends", "cap", "staticCap"].includes(err.field ?? "") ? err.text : ""}</p>
        <div className="sm:col-span-2"><Button type="submit">Create event</Button></div>
        {done && <p role="status" className="sm:col-span-2">{done}</p>}
      </form>
    </section>
  );
}
