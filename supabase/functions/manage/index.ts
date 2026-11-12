/**
 * POST /manage { token, action }: the receipt's links. No account needed.
 *   view        letter status (no content)              manage token
 *   cancel      delete this letter                      manage token
 *   not-me      delete everything for this address and block it   manage token
 *   unsubscribe same, from any email footer             unsubscribe token
 *   send-now    DEV_MODE only: deliver this letter now  manage token
 */
import { z } from "zod";

import { db, rateLimit } from "../_shared/db.ts";
import { deliverDueLetters } from "../_shared/delivery.ts";
import { isDevMode, keys } from "../_shared/env.ts";
import { HttpError, clientIp, log, maskEmail, serve } from "../_shared/http.ts";
import { verifyLink } from "../_shared/tokens.ts";

const schema = z.object({
  token: z.string().max(1000),
  action: z.enum(["view", "cancel", "not-me", "unsubscribe", "send-now"]),
});

const expired = () =>
  new HttpError(400, "expired", "This link has expired or isn't valid. Use the link in your most recent email from us.");

serve("manage", async (req, raw) => {
  const { token, action } = schema.parse(raw);
  await rateLimit("manage-ip", clientIp(req), 3600, 120);
  const linkKey = await keys.link();

  if (action === "unsubscribe") {
    const p = await verifyLink(linkKey, token, "unsubscribe");
    if (!p) throw expired();
    const { data: removed, error } = await db().rpc("suppress_email", { p_email_hash: p.id, p_reason: "unsubscribe" });
    if (error) throw error;
    log("manage", "unsubscribed", { removed });
    return { done: true, removed };
  }

  // Every other action uses the per-letter manage token. Unsubscribe tokens also
  // let the page show a confirmation screen without revealing anything.
  const p = await verifyLink(linkKey, token, "manage");
  if (!p) {
    if (action === "view" && (await verifyLink(linkKey, token, "unsubscribe"))) return { kind: "unsubscribe" };
    throw expired();
  }

  const { data: letter, error } = await db()
    .from("letters")
    .select("id, status, deliver_at, created_at, recipient_email, email_hash, source, events(name)")
    .eq("id", p.id)
    .maybeSingle();
  if (error) throw error;

  if (action === "view") {
    if (!letter) return { kind: "letter", exists: false };
    return {
      kind: "letter",
      exists: true,
      status: letter.status,
      deliverAt: letter.deliver_at,
      writtenAt: letter.created_at,
      email: maskEmail(letter.recipient_email),
      eventName: (letter.events as { name?: string } | null)?.name ?? null,
      devSendNow: isDevMode() && letter.status === "sealed",
    };
  }

  if (!letter) return { done: true, removed: 0 };

  if (action === "cancel") {
    const { data: ok, error: e } = await db().rpc("cancel_letter", { p_id: letter.id });
    if (e) throw e;
    if (!ok) throw new HttpError(409, "too_late", "This letter has already been sent, so it can't be cancelled.");
    log("manage", "cancelled", { source: letter.source });
    return { done: true, removed: 1 };
  }

  if (action === "not-me") {
    const { data: removed, error: e } = await db().rpc("suppress_email", { p_email_hash: letter.email_hash, p_reason: "not_me" });
    if (e) throw e;
    log("manage", "not_me", { removed, source: letter.source });
    return { done: true, removed };
  }

  // send-now (development only)
  if (!isDevMode()) throw new HttpError(403, "disabled", "Send now is only available in development.");
  if (letter.status !== "sealed") throw new HttpError(409, "not_sealed", "Only sealed letters can be sent.");
  const { error: e } = await db()
    .from("letters")
    .update({ deliver_at: new Date().toISOString(), next_attempt_at: null })
    .eq("id", letter.id)
    .eq("status", "sealed");
  if (e) throw e;
  const result = await deliverDueLetters(30_000);
  const { data: after } = await db().from("letters").select("status, last_error").eq("id", letter.id).maybeSingle();
  return { done: true, result, status: after?.status ?? "deleted", error: after?.status === "delivered" ? null : after?.last_error };
});
