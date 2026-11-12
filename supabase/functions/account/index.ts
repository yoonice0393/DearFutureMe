/**
 * POST /account (signed-in user)
 *   { action: "export" }                     everything we hold about you, as JSON
 *   { action: "retarget" }                   send my waiting letters to my current account address
 *   { action: "delete", confirm: "DELETE" }  delete the account and every letter, permanently
 */
import { z } from "zod";

import { decryptLetter } from "../_shared/crypto.ts";
import { db, rateLimit, requireUser } from "../_shared/db.ts";
import { fromPgBytea } from "../_shared/encoding.ts";
import { keys } from "../_shared/env.ts";
import { HttpError, log, serve } from "../_shared/http.ts";
import { emailHash } from "../_shared/tokens.ts";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("export") }),
  z.object({ action: z.literal("retarget") }),
  z.object({ action: z.literal("delete"), confirm: z.literal("DELETE") }),
]);

serve("account", async (req, raw) => {
  const user = await requireUser(req);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "invalid", "Type DELETE to confirm.", "confirm");
  const input = parsed.data;
  await rateLimit("account", user.id, 3600, 20);

  if (input.action === "export") {
    const [{ data: profile, error: pErr }, { data: letters, error: lErr }] = await Promise.all([
      db().from("profiles").select("email, consent_version, consent_at, created_at").eq("id", user.id).single(),
      db()
        .from("letters")
        .select("id, status, source, recipient_email, deliver_at, timezone, is_sealed, created_at, delivered_at, consent_version, consent_at, body_ciphertext, body_iv, key_version, events(name)")
        .eq("user_id", user.id)
        .order("created_at"),
    ]);
    if (pErr) throw pErr;
    if (lErr) throw lErr;
    const key = await keys.letter();
    const out = [];
    for (const l of letters ?? []) {
      const sealedShut = l.is_sealed && l.status !== "delivered";
      const content = sealedShut
        ? null
        : await decryptLetter(key, l.id, fromPgBytea(l.body_ciphertext), fromPgBytea(l.body_iv), l.key_version);
      out.push({
        id: l.id,
        status: l.status,
        writtenAt: l.created_at,
        deliverAt: l.deliver_at,
        deliveredAt: l.delivered_at,
        to: l.recipient_email,
        source: l.source,
        event: (l.events as { name?: string } | null)?.name ?? null,
        consent: { version: l.consent_version, at: l.consent_at },
        subject: content?.subject ?? null,
        body: content?.body ?? null,
        note: sealedShut ? "You sealed this letter shut; its content is released on delivery." : undefined,
      });
    }
    log("account", "exported", { letters: out.length });
    return { exportedAt: new Date().toISOString(), account: { email: user.email, ...profile }, letters: out };
  }

  if (input.action === "retarget") {
    if (!user.email) throw new HttpError(400, "no_email", "Your account has no email address.");
    const hash = await emailHash(await keys.email(), user.email);
    const { data, error } = await db()
      .from("letters")
      .update({ recipient_email: user.email.toLowerCase(), email_hash: hash })
      .eq("user_id", user.id)
      .in("status", ["sealed", "pending_verification", "failed"])
      .select("id");
    if (error) throw error;
    return { updated: data.length };
  }

  // delete: every letter linked to the account or addressed to it, then the account itself.
  const { error: e1 } = await db().from("letters").delete().eq("user_id", user.id);
  if (e1) throw e1;
  if (user.email) {
    const { error: e2 } = await db().from("letters").delete().is("user_id", null).eq("recipient_email", user.email.toLowerCase());
    if (e2) throw e2;
  }
  const { error: e3 } = await db().auth.admin.deleteUser(user.id);
  if (e3) throw e3;
  log("account", "deleted", {});
  return { deleted: true };
});
