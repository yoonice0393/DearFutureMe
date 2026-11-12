/**
 * POST /admin (profiles.role = 'admin' only). Counts, statuses and controls,
 * never letter content or email addresses.
 *   overview | create-event | pause-event | revoke-kiosk | retry-failed
 */
import { z } from "zod";

import { db, requireUser } from "../_shared/db.ts";
import { HttpError, log, serve } from "../_shared/http.ts";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("overview") }),
  z.object({
    action: z.literal("create-event"),
    name: z.string().trim().min(1).max(120),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,39}$/, "Use 3–40 lowercase letters, numbers and dashes."),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    pin: z.string().regex(/^\d{6,12}$/, "The staff PIN is 6 to 12 digits."),
    cap: z.number().int().min(1).max(100_000),
    staticCap: z.number().int().min(0).max(100_000),
  }),
  z.object({ action: z.literal("pause-event"), eventId: z.uuid(), paused: z.boolean() }),
  z.object({ action: z.literal("revoke-kiosk"), kioskId: z.uuid(), cancelLetters: z.boolean() }),
  z.object({ action: z.literal("retry-failed"), id: z.uuid() }),
]);

serve("admin", async (req, raw) => {
  const user = await requireUser(req);
  const { data: me, error: roleErr } = await db().from("profiles").select("role").eq("id", user.id).single();
  if (roleErr) throw roleErr;
  if (me.role !== "admin") throw new HttpError(403, "forbidden", "This page is for DearFutureMe staff.");

  const input = schema.parse(raw);

  if (input.action === "overview") {
    const [events, kiosks, queue, failed, quota] = await Promise.all([
      db().rpc("event_stats"),
      db().rpc("kiosk_stats"),
      db().rpc("queue_stats"),
      db().from("letters").select("id, attempts, last_error, deliver_at, source").eq("status", "failed").order("deliver_at").limit(50),
      db().from("daily_quota").select("provider, used").eq("day", new Date().toISOString().slice(0, 10)),
    ]);
    for (const r of [events, kiosks, queue, failed, quota]) if (r.error) throw r.error;
    return {
      events: events.data,
      kiosks: kiosks.data,
      queue: Object.fromEntries((queue.data as { status: string; n: number }[]).map((q) => [q.status, q.n])),
      failed: failed.data,
      quotaToday: quota.data,
    };
  }

  if (input.action === "create-event") {
    if (Date.parse(input.endsAt) <= Date.parse(input.startsAt)) {
      throw new HttpError(400, "invalid", "The event must end after it starts.", "endsAt");
    }
    const { data, error } = await db().rpc("create_event", {
      p_name: input.name,
      p_slug: input.slug,
      p_starts: input.startsAt,
      p_ends: input.endsAt,
      p_staff_pin: input.pin,
      p_cap: input.cap,
      p_static_cap: input.staticCap,
    });
    if (error) {
      if (error.code === "23505") throw new HttpError(409, "slug_taken", "That event code is already used.", "slug");
      throw error;
    }
    log("admin", "event_created", { slug: input.slug });
    return { eventId: data };
  }

  if (input.action === "pause-event") {
    const { error } = await db().from("events").update({ paused: input.paused }).eq("id", input.eventId);
    if (error) throw error;
    log("admin", input.paused ? "event_paused" : "event_resumed", { eventId: input.eventId });
    return { done: true };
  }

  if (input.action === "revoke-kiosk") {
    const { data, error } = await db().rpc("revoke_kiosk", { p_kiosk_id: input.kioskId, p_cancel_letters: input.cancelLetters });
    if (error) throw error;
    log("admin", "kiosk_revoked", { cancelled: data });
    return { cancelled: data };
  }

  // retry-failed: back into the queue for the next hourly run.
  const { error } = await db()
    .from("letters")
    .update({ status: "sealed", attempts: 0, next_attempt_at: null, last_error: null })
    .eq("id", input.id)
    .eq("status", "failed");
  if (error) throw error;
  return { done: true };
});
