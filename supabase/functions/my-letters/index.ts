/**
 * POST /my-letters (signed-in owner only)
 *   { action: "claim" }                         link booth/guest letters sent to my (verified) address
 *   { action: "cancel", id }                    delete a letter that hasn't been sent
 *   { action: "delete", id }                    remove a delivered/failed letter or a draft from the archive
 *   { action: "reschedule", id, deliverAt }     new date; also retries a failed letter
 */
import { z } from "zod";

import { isDeliverAtAllowed } from "../_shared/letter.ts";
import { db, rateLimit, requireUser } from "../_shared/db.ts";
import { HttpError, log, serve } from "../_shared/http.ts";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("claim") }),
  z.object({ action: z.literal("cancel"), id: z.uuid() }),
  z.object({ action: z.literal("delete"), id: z.uuid() }),
  z.object({ action: z.literal("reschedule"), id: z.uuid(), deliverAt: z.iso.datetime({ offset: true }) }),
]);

serve("my-letters", async (req, raw) => {
  const user = await requireUser(req);
  const input = schema.parse(raw);
  await rateLimit("my-letters", user.id, 3600, 200);

  if (input.action === "claim") {
    // The magic link proved this address belongs to the user.
    if (!user.email) return { claimed: 0 };
    const { data, error } = await db()
      .from("letters")
      .update({ user_id: user.id })
      .is("user_id", null)
      .eq("recipient_email", user.email.toLowerCase())
      .neq("status", "draft")
      .select("id");
    if (error) throw error;
    if (data.length) log("my-letters", "claimed", { n: data.length });
    return { claimed: data.length };
  }

  const { data: letter, error } = await db()
    .from("letters")
    .select("id, status")
    .eq("id", input.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!letter) throw new HttpError(404, "not_found", "We couldn't find that letter.");

  if (input.action === "cancel") {
    if (!["sealed", "pending_verification", "failed", "draft"].includes(letter.status)) {
      throw new HttpError(409, "too_late", "This letter is already on its way or delivered.");
    }
    const { error: e } = await db().rpc("cancel_letter", { p_id: letter.id });
    if (e) throw e;
    return { done: true };
  }

  if (input.action === "delete") {
    if (!["delivered", "failed", "draft"].includes(letter.status)) {
      throw new HttpError(409, "use_cancel", "Cancel a waiting letter instead.");
    }
    const { error: e } = await db().from("letters").delete().eq("id", letter.id).eq("user_id", user.id);
    if (e) throw e;
    return { done: true };
  }

  // reschedule
  if (!["sealed", "failed"].includes(letter.status)) {
    throw new HttpError(409, "not_sealed", "Only sealed letters can be rescheduled.");
  }
  const deliverAt = new Date(input.deliverAt);
  if (!isDeliverAtAllowed(deliverAt)) {
    throw new HttpError(400, "invalid", "Choose a date between one month and 25 years from today.", "deliverAt");
  }
  const { error: e } = await db()
    .from("letters")
    .update({ status: "sealed", deliver_at: deliverAt.toISOString(), attempts: 0, next_attempt_at: null, last_error: null })
    .eq("id", letter.id)
    .eq("user_id", user.id)
    .in("status", ["sealed", "failed"]);
  if (e) throw e;
  return { done: true, deliverAt: deliverAt.toISOString() };
});
