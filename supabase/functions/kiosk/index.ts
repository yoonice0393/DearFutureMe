/**
 * POST /kiosk
 *   { action: "register", eventSlug, pin, label? } → { token, eventName, presets, endsAt }
 *   { action: "status", kioskToken }               → { usable, live, eventName, presets, endsAt }
 *
 * Staff register a booth device with the event slug + staff PIN. The device
 * gets a random token; only its sha256 is stored. PIN attempts are limited
 * per event and per connection.
 */
import { z } from "zod";

import { db, eventIsLive, lookupKiosk, rateLimit } from "../_shared/db.ts";
import { HttpError, clientIp, log, serve } from "../_shared/http.ts";
import { randomToken, sha256Hex } from "../_shared/tokens.ts";

const register = z.object({
  action: z.literal("register"),
  eventSlug: z.string().trim().toLowerCase().min(3).max(40),
  pin: z.string().regex(/^\d{6,12}$/, "The staff PIN is 6 to 12 digits."),
  label: z.string().trim().max(60).optional(),
});
const status = z.object({ action: z.literal("status"), kioskToken: z.string().max(128) });

serve("kiosk", async (req, raw) => {
  if (raw.action === "status") {
    const input = status.parse(raw);
    const kiosk = await lookupKiosk(input.kioskToken);
    if (!kiosk) return { usable: false, live: false };
    return {
      usable: kiosk.usable,
      live: kiosk.usable && eventIsLive(kiosk),
      eventName: kiosk.event_name,
      presets: kiosk.allowed_presets,
      startsAt: kiosk.starts_at,
      endsAt: kiosk.ends_at,
    };
  }

  const parsed = register.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, "invalid", issue.message, String(issue.path[0] ?? ""));
  }
  const input = parsed.data;

  const tooMany = "Too many PIN attempts. Wait 15 minutes and try again.";
  await rateLimit("pin-event", input.eventSlug, 15 * 60, 10, tooMany);
  await rateLimit("pin-ip", clientIp(req), 15 * 60, 10, tooMany);

  const { data: eventId, error } = await db().rpc("verify_staff_pin", { p_slug: input.eventSlug, p_pin: input.pin });
  if (error) throw error;
  if (!eventId) {
    log("kiosk", "pin_rejected", { slug: input.eventSlug });
    throw new HttpError(401, "pin", "That event code and PIN don't match an upcoming event.", "pin");
  }

  const token = randomToken(32);
  const { error: insErr } = await db().from("kiosks").insert({
    event_id: eventId,
    label: input.label || null,
    token_hash: await sha256Hex(token),
  });
  if (insErr) throw insErr;

  const kiosk = await lookupKiosk(token);
  log("kiosk", "registered", { event: input.eventSlug });
  return {
    token,
    eventName: kiosk?.event_name,
    presets: kiosk?.allowed_presets,
    startsAt: kiosk?.starts_at,
    endsAt: kiosk?.ends_at,
  };
});
