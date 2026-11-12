/**
 * POST /verify { token }: the web flow's "confirm your email" link.
 * Seals the letter and sends the receipt. Safe to call twice.
 */
import { z } from "zod";

import { db, rateLimit } from "../_shared/db.ts";
import { processOutbox } from "../_shared/delivery.ts";
import { keys } from "../_shared/env.ts";
import { HttpError, clientIp, serve } from "../_shared/http.ts";
import { verifyLink } from "../_shared/tokens.ts";

const schema = z.object({ token: z.string().max(1000) });

serve("verify", async (req, raw) => {
  const { token } = schema.parse(raw);
  await rateLimit("verify-ip", clientIp(req), 3600, 60);
  const payload = await verifyLink(await keys.link(), token, "verify");
  if (!payload) {
    throw new HttpError(400, "expired", "This confirmation link has expired or isn't valid. Please write your letter again.");
  }

  const { data: letter, error } = await db()
    .from("letters")
    .select("id, status, deliver_at")
    .eq("id", payload.id)
    .maybeSingle();
  if (error) throw error;
  if (!letter) throw new HttpError(404, "not_found", "We couldn't find this letter. It may have been cancelled.");
  if (letter.status !== "pending_verification") {
    return { status: letter.status, deliverAt: letter.deliver_at, already: true };
  }

  const { error: upErr } = await db()
    .from("letters")
    .update({ status: "sealed" })
    .eq("id", letter.id)
    .eq("status", "pending_verification");
  if (upErr) throw upErr;

  const { data: row, error: qErr } = await db()
    .from("email_outbox")
    .upsert({ kind: "receipt", letter_id: letter.id }, { onConflict: "letter_id,kind", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (qErr) throw qErr;
  if (row?.id) await processOutbox({ id: row.id }).catch(() => undefined); // the cron retries if this fails

  return { status: "sealed", deliverAt: letter.deliver_at, already: false };
});
