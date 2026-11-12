import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { emailSchema } from "@shared/letter.ts";
import { Button } from "@/components/Button";
import { Field, inputClass } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { EmailField } from "@/components/letter/EmailField";
import { useAuth } from "@/features/auth/AuthContext";
import { deleteMyAccount, exportMyData, retargetLetters } from "@/lib/api";
import { getSupabase } from "@/lib/supabase";
import { usePageTitle } from "@/lib/usePageTitle";

export function Settings() {
  usePageTitle("Account settings");
  const { session, email, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const [newEmail, setNewEmail] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [retargetMsg, setRetargetMsg] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading) return <p className="mx-auto max-w-page px-4 py-24 text-pencil md:px-8">Loading…</p>;
  if (!session) return <Navigate to="/signin" replace />;

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(newEmail);
    if (!parsed.success) return setEmailMsg({ ok: false, text: parsed.error.issues[0].message });
    if (parsed.data === email) return setEmailMsg({ ok: false, text: "That's already your address." });
    setBusy("email");
    const { error } = await (await getSupabase())!.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${location.origin}/settings` });
    setBusy(null);
    setEmailMsg(
      error
        ? { ok: false, text: "We couldn't start the change. Please try again in a minute." }
        : { ok: true, text: `Check ${parsed.data} (and your current inbox) for confirmation links. The change finishes once you've confirmed.` },
    );
  }

  async function retarget() {
    setBusy("retarget");
    const r = await retargetLetters();
    setBusy(null);
    setRetargetMsg(r.ok ? `${r.updated} waiting ${r.updated === 1 ? "letter" : "letters"} will now go to ${email}.` : r.error);
  }

  async function download() {
    setBusy("export");
    const r = await exportMyData();
    setBusy(null);
    if (!r.ok) return setExportMsg(r.error);
    const { ok: _ok, ...data } = r;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dearfutureme-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg(`Downloaded ${data.letters.length} ${data.letters.length === 1 ? "letter" : "letters"}.`);
  }

  async function remove() {
    if (confirmText !== "DELETE") return setDeleteMsg("Type DELETE in capitals to confirm.");
    setBusy("delete");
    const r = await deleteMyAccount();
    setBusy(null);
    if (!r.ok) return setDeleteMsg(r.error);
    try {
      localStorage.removeItem("dfm-draft");
    } catch {
      /* ignore */
    }
    await signOut();
    navigate("/", { replace: true });
  }

  const section = "border-t border-rule py-12";
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />
      <div className="mx-auto max-w-page px-4 md:px-8">
        <div className="max-w-[640px]">
          <section aria-labelledby="s-email" className={section}>
            <h2 id="s-email" className="text-xl">Email address</h2>
            <p className="mt-2 text-pencil">
              You sign in with <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{email}</strong>.
            </p>
            <form onSubmit={changeEmail} noValidate className="mt-6 space-y-6">
              <EmailField value={newEmail} onChange={(v) => { setNewEmail(v); setEmailMsg(null); }} label="New email address" hint="We'll email a confirmation link to the new address."
                error={emailMsg && !emailMsg.ok ? emailMsg.text : null} />
              <Button type="submit" variant="secondary" disabled={busy === "email"}>Change email</Button>
              {emailMsg?.ok && <p role="status">{emailMsg.text}</p>}
            </form>
            <div className="mt-8 border-l-2 border-rule pl-6">
              <p className="text-sm text-pencil">
                Letters already sealed keep the address they were written to. After changing your email, you can send them
                to your current address instead.
              </p>
              <Button variant="quiet" onClick={retarget} disabled={busy === "retarget"} className="mt-2 px-0">
                Send my waiting letters to {email}
              </Button>
              {retargetMsg && <p role="status" className="mt-2 text-sm">{retargetMsg}</p>}
            </div>
          </section>

          <section aria-labelledby="s-export" className={section}>
            <h2 id="s-export" className="text-xl">Download your data</h2>
            <p className="mt-2 text-pencil">
              A JSON file with your account details and every letter, including the text of letters you're allowed to read.
            </p>
            <Button variant="secondary" onClick={download} disabled={busy === "export"} className="mt-6">
              {busy === "export" ? "Preparing…" : "Download my data"}
            </Button>
            {exportMsg && <p role="status" className="mt-3 text-sm">{exportMsg}</p>}
          </section>

          <section aria-labelledby="s-delete" className={section}>
            <h2 id="s-delete" className="text-xl text-postal">Delete your account</h2>
            <p className="mt-2">
              This permanently deletes your account and every letter linked to it or addressed to {email}, including sealed
              letters that haven't arrived yet. It can't be undone. Backups are cleared within 30 days.
            </p>
            <Field label='Type "DELETE" to confirm' error={deleteMsg} className="mt-6">
              {({ id, describedBy, invalid }) => (
                <input id={id} aria-describedby={describedBy} aria-invalid={invalid} value={confirmText}
                  onChange={(e) => { setConfirmText(e.target.value); setDeleteMsg(null); }}
                  autoComplete="off" autoCapitalize="characters" className={`${inputClass} max-w-[240px]`} />
              )}
            </Field>
            <Button onClick={remove} disabled={busy === "delete" || confirmText !== "DELETE"} className="mt-6">
              {busy === "delete" ? "Deleting…" : "Delete my account and letters"}
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
