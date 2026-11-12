/**
 * Random tokens, hashing and signed codes.
 *  - Kiosk tokens: 32 random bytes; only sha256(token) is stored.
 *  - Email hashes: HMAC-SHA256(lowercased email) so limits never scan plaintext.
 *  - Event codes: HMAC-signed, short-lived (rotating QR) or event-long (printed QR).
 *  - Link tokens: HMAC-signed {purpose, id, exp} for manage/cancel/unsubscribe/verify.
 */
import { bytesToUuid, fromBase64Url, fromUtf8, toBase64Url, toHex, utf8, uuidToBytes } from "./encoding.ts";

export function randomToken(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(input: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", utf8.encode(input))));
}

export async function hmacKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("HMAC secret too short");
  return crypto.subtle.importKey("raw", utf8.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function hmac(key: CryptoKey, message: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, utf8.encode(message)));
}

/** Constant-time comparison of two strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function emailHash(key: CryptoKey, email: string): Promise<string> {
  return toHex(await hmac(key, `email:${normalizeEmail(email)}`));
}

// ── Event codes ──────────────────────────────────────────────────────────────
// rotating: r.<eventId b64url>.<issuedAt base36>.<sig>   valid ROTATING_TTL after issue
// static:   s.<eventId b64url>.<sig>                      valid for the event window

export const ROTATE_EVERY_SECONDS = 5 * 60;
export const ROTATING_TTL_SECONDS = 35 * 60; // ~30 min to write after a scan, plus rotation slack

export type EventCode = { kind: "rotating" | "static"; eventId: string; issuedAt?: number };

async function codeSig(key: CryptoKey, body: string): Promise<string> {
  return toBase64Url((await hmac(key, `event-code:${body}`)).slice(0, 16));
}

export async function makeEventCode(
  key: CryptoKey,
  kind: "rotating" | "static",
  eventId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const id = toBase64Url(uuidToBytes(eventId));
  const body = kind === "rotating" ? `r.${id}.${nowSeconds.toString(36)}` : `s.${id}`;
  return `${body}.${await codeSig(key, body)}`;
}

export async function parseEventCode(
  key: CryptoKey,
  code: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<EventCode | { error: "invalid" | "expired" }> {
  if (code.length > 200) return { error: "invalid" };
  const parts = code.split(".");
  const kind = parts[0];
  if (!((kind === "r" && parts.length === 4) || (kind === "s" && parts.length === 3))) return { error: "invalid" };
  const sig = parts[parts.length - 1];
  const body = parts.slice(0, -1).join(".");
  if (!safeEqual(sig, await codeSig(key, body))) return { error: "invalid" };

  let eventId: string;
  try {
    eventId = bytesToUuid(fromBase64Url(parts[1]));
  } catch {
    return { error: "invalid" };
  }
  if (kind === "s") return { kind: "static", eventId };

  const issuedAt = parseInt(parts[2], 36);
  if (!Number.isFinite(issuedAt)) return { error: "invalid" };
  if (issuedAt > nowSeconds + 60 || nowSeconds - issuedAt > ROTATING_TTL_SECONDS) return { error: "expired" };
  return { kind: "rotating", eventId, issuedAt };
}

// ── Signed link tokens ───────────────────────────────────────────────────────

export type LinkPurpose = "manage" | "cancel" | "unsubscribe" | "verify";
export type LinkPayload = { p: LinkPurpose; id: string; exp: number };

export async function signLink(key: CryptoKey, payload: LinkPayload): Promise<string> {
  const body = toBase64Url(utf8.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmac(key, `link:${body}`));
  return `${body}.${sig}`;
}

export async function verifyLink(
  key: CryptoKey,
  token: string,
  purpose: LinkPurpose,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<LinkPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig || token.length > 1000) return null;
  if (!safeEqual(sig, toBase64Url(await hmac(key, `link:${body}`)))) return null;
  try {
    const payload = JSON.parse(fromUtf8.decode(fromBase64Url(body))) as LinkPayload;
    if (payload.p !== purpose || typeof payload.id !== "string" || payload.exp < nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}
