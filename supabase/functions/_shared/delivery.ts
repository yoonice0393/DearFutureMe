/**
 * The two delivery loops shared by `dispatch` (cron) and `submit-letter` (inline receipt).
 */
import { decryptLetter } from "./crypto.ts";
import { db } from "./db.ts";
import { fromPgBytea } from "./encoding.ts";
import { keys, optionalEnv } from "./env.ts";
import { log } from "./http.ts";
import { manageUrl, oneClickUnsubscribeUrl, unsubscribeUrl, verifyUrl, writeBackUrl } from "./links.ts";
import { pingProviders, sendMail, type Mail } from "./mail/providers.ts";
import { formatDate, heartbeatEmail, letterEmail, receiptEmail, verifyEmail } from "./mail/templates.ts";

type OutboxItem = { id: string; kind: "receipt" | "verify" | "heartbeat"; letter_id: string | null; attempts: number };

async function listUnsubscribeHeaders(emailHash: string): Promise<Record<string, string>> {
  return {
    "List-Unsubscribe": `<${await oneClickUnsubscribeUrl(emailHash)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

async function buildOutboxMail(item: OutboxItem): Promise<Mail | "skip"> {
  if (item.kind === "heartbeat") {
    const to = optionalEnv("ADMIN_EMAIL") ?? optionalEnv("MAIL_FROM_EMAIL");
    if (!to) return "skip";
    const [{ count: sealed }, { count: failed }, { count: queued }, next, pings] = await Promise.all([
      db().from("letters").select("id", { count: "exact", head: true }).eq("status", "sealed"),
      db().from("letters").select("id", { count: "exact", head: true }).eq("status", "failed"),
      db().from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "queued"),
      db().from("letters").select("deliver_at").eq("status", "sealed").order("deliver_at").limit(1).maybeSingle(),
      pingProviders(),
    ]);
    const m = heartbeatEmail({
      sealed: sealed ?? 0,
      failed: failed ?? 0,
      queued: queued ?? 0,
      nextDelivery: next.data?.deliver_at ? formatDate(new Date(next.data.deliver_at)) : null,
      providers: pings,
    });
    return { to, ...m, tag: "heartbeat" };
  }

  const { data: letter, error } = await db()
    .from("letters")
    .select("id, recipient_email, email_hash, deliver_at, status, timezone, events(name)")
    .eq("id", item.letter_id!)
    .maybeSingle();
  if (error) throw error;
  if (!letter) return "skip"; // cancelled in the meantime
  const tz = letter.timezone ?? "Asia/Manila";
  const arrives = formatDate(new Date(letter.deliver_at), tz);
  const unsub = await unsubscribeUrl(letter.email_hash);
  const headers = await listUnsubscribeHeaders(letter.email_hash);

  if (item.kind === "verify") {
    if (letter.status !== "pending_verification") return "skip";
    return { to: letter.recipient_email, ...verifyEmail({ verifyUrl: await verifyUrl(letter.id), arrives, unsubscribeUrl: unsub }), headers, tag: "verify" };
  }
  if (letter.status !== "sealed") return "skip";
  const deliverAt = new Date(letter.deliver_at);
  const eventName = (letter.events as { name?: string } | null)?.name ?? null;
  return {
    to: letter.recipient_email,
    ...receiptEmail({
      arrives,
      manageUrl: await manageUrl(letter.id, deliverAt),
      notMeUrl: await manageUrl(letter.id, deliverAt, "not-me"),
      unsubscribeUrl: unsub,
      eventName,
    }),
    headers,
    tag: "receipt",
  };
}

/** Send queued receipts / verification links / heartbeats. Pass an id to send one now. */
export async function processOutbox(opts: { limit?: number; id?: string } = {}): Promise<{ sent: number; deferred: number }> {
  const { data, error } = await db().rpc("claim_outbox", { p_limit: opts.limit ?? 20, p_id: opts.id ?? null });
  if (error) throw error;
  let sent = 0;
  let deferred = 0;
  for (const item of (data ?? []) as OutboxItem[]) {
    try {
      const mail = await buildOutboxMail(item);
      if (mail === "skip") {
        await db().from("email_outbox").update({ status: "cancelled" }).eq("id", item.id);
        continue;
      }
      const r = await sendMail({ ...mail, idempotencyKey: `outbox-${item.id}` });
      await db().rpc("finish_outbox", {
        p_id: item.id,
        p_ok: r.ok,
        p_error: r.ok ? null : r.error,
        p_refund: !r.ok && r.providerDown,
        p_retry_at: !r.ok ? (r.retryAt ?? null) : null,
      });
      if (item.letter_id) {
        await db().from("send_log").insert({
          letter_id: item.letter_id,
          kind: item.kind === "heartbeat" ? "receipt" : item.kind,
          attempt: item.attempts,
          provider: r.ok ? r.provider : null,
          provider_message_id: r.ok ? r.messageId : null,
          status: r.ok ? "sent" : "error",
          error: r.ok ? null : r.error.slice(0, 500),
        });
      }
      if (r.ok) sent++;
      else deferred++;
    } catch (err) {
      deferred++;
      const msg = err instanceof Error ? err.message : String(err);
      log("outbox", "error", { id: item.id, message: msg });
      await db().rpc("finish_outbox", { p_id: item.id, p_ok: false, p_error: msg, p_refund: false, p_retry_at: null });
    }
  }
  return { sent, deferred };
}

type DueLetter = {
  id: string;
  recipient_email: string;
  email_hash: string;
  body_ciphertext: string;
  body_iv: string;
  key_version: number;
  created_at: string;
  deliver_at: string;
  attempts: number;
  timezone: string | null;
  event_name: string | null;
};

/** Deliver due letters until none are left or the time budget runs out. */
export async function deliverDueLetters(budgetMs = 100_000): Promise<{ delivered: number; retry: number; failed: number }> {
  const started = Date.now();
  const totals = { delivered: 0, retry: 0, failed: 0 };
  await db().rpc("sweep_stuck_letters");
  let providersDown = false;

  while (!providersDown && Date.now() - started < budgetMs) {
    const { data, error } = await db().rpc("claim_due_letters", { p_limit: 10 });
    if (error) throw error;
    const batch = (data ?? []) as DueLetter[];
    if (!batch.length) break;

    for (const l of batch) {
      // Record the attempt BEFORE calling the provider (see sweep_stuck_letters).
      await db().from("send_log").insert({ letter_id: l.id, kind: "letter", attempt: l.attempts, status: "attempt" });
      let outcome: string;
      try {
        const content = await decryptLetter(
          await keys.letter(),
          l.id,
          fromPgBytea(l.body_ciphertext),
          fromPgBytea(l.body_iv),
          l.key_version,
        );
        const tz = l.timezone ?? "Asia/Manila";
        const mail = letterEmail({
          subject: content.subject,
          body: content.body,
          writtenOn: formatDate(new Date(l.created_at), tz),
          deliveredOn: formatDate(new Date(), tz),
          eventName: l.event_name,
          writeBackUrl: writeBackUrl(),
          unsubscribeUrl: await unsubscribeUrl(l.email_hash),
        });
        const r = await sendMail({
          to: l.recipient_email,
          ...mail,
          headers: await listUnsubscribeHeaders(l.email_hash),
          tag: "letter",
          idempotencyKey: `letter-${l.id}`,
        });
        if (r.ok) {
          const { error: e } = await db().rpc("mark_letter_sent", { p_id: l.id, p_provider: r.provider, p_message_id: r.messageId });
          if (e) throw e;
          outcome = "delivered";
        } else {
          const { data: o, error: e } = await db().rpc("mark_letter_failed", {
            p_id: l.id,
            p_error: r.error,
            p_refund: r.providerDown,
            p_retry_at: r.retryAt ?? null,
          });
          if (e) throw e;
          outcome = !r.retryable ? "failed" : (o as string);
          // Quota used up or key rejected: the rest of the batch would fail the same way.
          if (r.providerDown) providersDown = true;
          if (!r.retryable && o !== "failed") {
            // Permanent problem (e.g. invalid address): stop now.
            await db().from("letters").update({ status: "failed" }).eq("id", l.id);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log("letters", "error", { id: l.id, message: msg });
        const { data: o } = await db().rpc("mark_letter_failed", { p_id: l.id, p_error: msg, p_refund: false, p_retry_at: null });
        outcome = (o as string) ?? "retry";
      }
      if (outcome === "delivered") totals.delivered++;
      else if (outcome === "failed") totals.failed++;
      else totals.retry++;
      if (providersDown) break;
    }
  }
  return totals;
}
