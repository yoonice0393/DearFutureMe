/**
 * POST /submit-letter: validate, check the right gate, encrypt, store.
 *
 * Three ways in:
 *   kioskToken  → registered booth device: no verification, sealed immediately.
 *   eventCode   → attendee's phone during a live event: no verification, sealed.
 *   neither     → public website: signed-in owner of the address → sealed;
 *                 otherwise pending_verification until the emailed link is clicked.
 *
 * Every limit that matters (per email, per event, static QR cap, suppression)
 * is enforced inside create_letter() under a lock, so it can't be raced.
 */
import { MAX_LETTERS_PER_EMAIL, isDeliverAtAllowed, letterSubmitSchema } from "../_shared/letter.ts";
import { encryptLetter, CURRENT_KEY_VERSION } from "../_shared/crypto.ts";
import { db, eventIsLive, getUser, lookupKiosk, rateLimit } from "../_shared/db.ts";
import { toPgBytea } from "../_shared/encoding.ts";
import { keys } from "../_shared/env.ts";
import { HttpError, clientIp, log, maskEmail, serve } from "../_shared/http.ts";
import { emailHash, parseEventCode, randomToken, sha256Hex } from "../_shared/tokens.ts";
import { verifyTurnstile } from "../_shared/turnstile.ts";

const ERRORS: Record<string, [number, string, string?]> = {
  suppressed: [403, "This address has asked not to receive letters from us.", "email"],
  email_limit: [409, `This address already has ${MAX_LETTERS_PER_EMAIL} letters waiting. That's the limit for now.`, "email"],
  event_closed: [403, "This event has ended. You can still write a letter on our website."],
  event_cap: [403, "This event has reached its letter limit. You can still write one on our website."],
  static_cap: [403, "This QR code has reached its limit. Please scan the code on the booth screen."],
  kiosk_inactive: [403, "This booth device has been switched off by staff."],
};

serve("submit-letter", async (req, raw) => {
  const parsed = letterSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new HttpError(400, "invalid", issue.message, String(issue.path[0] ?? ""));
  }
  const input = parsed.data;
  const deliverAt = new Date(input.deliverAt);
  if (!isDeliverAtAllowed(deliverAt)) {
    throw new HttpError(400, "invalid", "Choose a date between one month and 25 years from today.", "deliverAt");
  }

  let source: "booth" | "event_phone" | "web";
  let status: "sealed" | "pending_verification";
  let kioskId: string | null = null;
  let eventId: string | null = null;
  let viaStatic = false;
  let userId: string | null = null;

  if (input.kioskToken) {
    // ── Booth device ───────────────────────────────────────────────────────
    const kiosk = await lookupKiosk(input.kioskToken);
    if (!kiosk || !kiosk.usable) throw new HttpError(403, "kiosk_inactive", ERRORS.kiosk_inactive[1]);
    if (!eventIsLive(kiosk)) throw new HttpError(403, "event_closed", ERRORS.event_closed[1]);
    await rateLimit("kiosk", kiosk.kiosk_id, 60, 6, "This booth is sending letters too quickly. Please wait a moment.");
    source = "booth";
    status = "sealed";
    kioskId = kiosk.kiosk_id;
    eventId = kiosk.event_id;
  } else if (input.eventCode) {
    // ── Attendee's own phone ───────────────────────────────────────────────
    const code = await parseEventCode(await keys.link(), input.eventCode);
    if ("error" in code) {
      throw new HttpError(403, code.error === "expired" ? "code_expired" : "code_invalid",
        "This QR code has expired. Scan the code on the booth screen again, or write a letter on our website.");
    }
    await verifyTurnstile(input.turnstileToken, req, { required: false });
    await rateLimit("event", code.eventId, 60, 60, "Lots of letters are arriving right now. Please try again in a minute.");
    source = "event_phone";
    status = "sealed";
    eventId = code.eventId;
    viaStatic = code.kind === "static";
  } else {
    // ── Public website ─────────────────────────────────────────────────────
    await verifyTurnstile(input.turnstileToken, req, { required: true });
    const user = await getUser(req);
    await rateLimit("ip", clientIp(req), 3600, 10, "Too many letters from this connection. Please try again later.");
    if (user) await rateLimit("user", user.id, 86_400, 20);
    source = "web";
    userId = user?.id ?? null;
    // A signed-in user has already proven they own their account address.
    status = user?.email && user.email.toLowerCase() === input.email ? "sealed" : "pending_verification";
  }

  const letterId = crypto.randomUUID();
  const { ciphertext, iv } = await encryptLetter(await keys.letter(), letterId, {
    subject: input.subject,
    body: input.body,
  });
  const hash = await emailHash(await keys.email(), input.email);

  const { data: result, error } = await db().rpc("create_letter", {
    p_id: letterId,
    p_user_id: userId,
    p_email: input.email,
    p_email_hash: hash,
    p_source: source,
    p_kiosk_id: kioskId,
    p_event_id: eventId,
    p_via_static_code: viaStatic,
    p_ciphertext: toPgBytea(ciphertext),
    p_iv: toPgBytea(iv),
    p_deliver_at: deliverAt.toISOString(),
    p_timezone: input.timezone ?? null,
    p_status: status,
    p_consent_version: input.policyVersion,
    p_max_per_email: MAX_LETTERS_PER_EMAIL,
  });
  if (error) throw error;
  if (result !== "ok") {
    const [httpStatus, message, field] = ERRORS[result as string] ?? [400, "We couldn't schedule this letter."];
    log("submit-letter", "rejected", { reason: result, source, email: maskEmail(input.email) });
    throw new HttpError(httpStatus, String(result), message, field);
  }

  if (status === "pending_verification") {
    const token = randomToken();
    const { error: vErr } = await db().from("email_verifications").insert({
      token_hash: await sha256Hex(token),
      email_hash: hash,
      letter_id: letterId,
      expires_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
    });
    if (vErr) throw vErr;
    // Phase 5: email the verification link (/verify?token=…) via the outbox.
  }
  // The draft it was written from is no longer needed.
  if (userId && input.draftId) {
    await db().from("letters").delete().eq("id", input.draftId).eq("user_id", userId).eq("status", "draft");
  }
  // Phase 5: queue the instant receipt email (with cancel / "This wasn't me" links).

  log("submit-letter", "created", { source, status, keyVersion: CURRENT_KEY_VERSION, email: maskEmail(input.email) });
  return { status, letterId, deliverAt: deliverAt.toISOString() };
});
