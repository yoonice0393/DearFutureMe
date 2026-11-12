/**
 * POST /event-status { eventCode } → is this QR still good for a no-verification letter?
 * Called when /e/:eventCode opens, so attendees learn about an expired code
 * before they write, not after.
 */
import { z } from "zod";

import { db, eventIsLive } from "../_shared/db.ts";
import { keys } from "../_shared/env.ts";
import { serve } from "../_shared/http.ts";
import { ROTATING_TTL_SECONDS, parseEventCode } from "../_shared/tokens.ts";

const schema = z.object({ eventCode: z.string().max(200) });

serve("event-status", async (_req, raw) => {
  const { eventCode } = schema.parse(raw);
  const code = await parseEventCode(await keys.link(), eventCode);
  if ("error" in code) return { valid: false, reason: code.error };

  const { data: event, error } = await db()
    .from("events")
    .select("name, starts_at, ends_at, paused, allowed_presets")
    .eq("id", code.eventId)
    .maybeSingle();
  if (error) throw error;
  if (!event) return { valid: false, reason: "invalid" };
  if (!eventIsLive(event)) return { valid: false, reason: event.paused ? "paused" : "ended", eventName: event.name };

  const codeExpires = code.issuedAt ? (code.issuedAt + ROTATING_TTL_SECONDS) * 1000 : Infinity;
  return {
    valid: true,
    eventName: event.name,
    presets: event.allowed_presets,
    expiresAt: new Date(Math.min(codeExpires, Date.parse(event.ends_at))).toISOString(),
  };
});
