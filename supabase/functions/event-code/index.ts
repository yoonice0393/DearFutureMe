/**
 * POST /event-code { kioskToken, kind: "rotating" | "static" }
 *
 * Issues the code behind the booth QR. Only a registered, active booth device
 * can ask. Rotating codes are re-issued every 5 minutes by /booth/qr and stay
 * valid ~35 minutes; static codes (for printed standees) last the whole event
 * but share a lower submission cap.
 */
import { z } from "zod";

import { eventIsLive, lookupKiosk, rateLimit } from "../_shared/db.ts";
import { keys } from "../_shared/env.ts";
import { HttpError, serve } from "../_shared/http.ts";
import { ROTATE_EVERY_SECONDS, ROTATING_TTL_SECONDS, makeEventCode } from "../_shared/tokens.ts";

const schema = z.object({
  kioskToken: z.string().max(128),
  kind: z.enum(["rotating", "static"]).default("rotating"),
});

serve("event-code", async (_req, raw) => {
  const input = schema.parse(raw);
  const kiosk = await lookupKiosk(input.kioskToken);
  if (!kiosk || !kiosk.usable) throw new HttpError(403, "kiosk_inactive", "This device isn't registered for an event.");
  if (Date.parse(kiosk.ends_at) < Date.now()) throw new HttpError(403, "event_closed", "This event has ended.");
  await rateLimit("event-code", kiosk.kiosk_id, 60, 20);

  const now = Math.floor(Date.now() / 1000);
  const code = await makeEventCode(await keys.link(), input.kind, kiosk.event_id, now);
  return {
    code,
    eventName: kiosk.event_name,
    live: eventIsLive(kiosk),
    refreshInSeconds: input.kind === "rotating" ? ROTATE_EVERY_SECONDS : null,
    expiresAt: input.kind === "rotating" ? new Date((now + ROTATING_TTL_SECONDS) * 1000).toISOString() : kiosk.ends_at,
  };
});
