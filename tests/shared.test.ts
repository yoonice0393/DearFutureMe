// Unit tests for the Edge Functions' shared crypto/token code.
// Run: npm test   (Node runs the TypeScript directly via type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";

import { decryptLetter, encryptLetter, importLetterKey } from "../supabase/functions/_shared/crypto.ts";
import { fromPgBytea, toBase64, toPgBytea } from "../supabase/functions/_shared/encoding.ts";
import {
  emailHash,
  hmacKey,
  makeEventCode,
  parseEventCode,
  ROTATING_TTL_SECONDS,
  signLink,
  verifyLink,
} from "../supabase/functions/_shared/tokens.ts";
import { isDeliverAtAllowed, letterSubmitSchema } from "../supabase/functions/_shared/letter.ts";

const KEY_B64 = toBase64(crypto.getRandomValues(new Uint8Array(32)));
const SECRET = "test-secret-that-is-definitely-longer-than-32-chars";
const ID_A = "11111111-2222-4333-8444-555555555555";
const ID_B = "66666666-7777-4888-9999-000000000000";

test("letters round-trip through AES-256-GCM", async () => {
  const key = await importLetterKey(KEY_B64);
  const content = { subject: "Hi future me", body: "Mahal kita.\n\n— ako ✉️ 😊" };
  const { ciphertext, iv } = await encryptLetter(key, ID_A, content);
  assert.equal(iv.length, 12);
  assert.ok(!new TextDecoder().decode(ciphertext).includes("Mahal"), "ciphertext must not contain plaintext");
  assert.deepEqual(await decryptLetter(key, ID_A, ciphertext, iv), content);
});

test("each encryption uses a fresh IV", async () => {
  const key = await importLetterKey(KEY_B64);
  const a = await encryptLetter(key, ID_A, { subject: "s", body: "b" });
  const b = await encryptLetter(key, ID_A, { subject: "s", body: "b" });
  assert.notDeepEqual(a.iv, b.iv);
  assert.notDeepEqual(a.ciphertext, b.ciphertext);
});

test("ciphertext moved to another letter id fails to decrypt", async () => {
  const key = await importLetterKey(KEY_B64);
  const { ciphertext, iv } = await encryptLetter(key, ID_A, { subject: "s", body: "secret" });
  await assert.rejects(decryptLetter(key, ID_B, ciphertext, iv));
});

test("tampered ciphertext or wrong key fails", async () => {
  const key = await importLetterKey(KEY_B64);
  const { ciphertext, iv } = await encryptLetter(key, ID_A, { subject: "s", body: "secret" });
  const tampered = ciphertext.slice();
  tampered[0] ^= 1;
  await assert.rejects(decryptLetter(key, ID_A, tampered, iv));
  const other = await importLetterKey(toBase64(crypto.getRandomValues(new Uint8Array(32))));
  await assert.rejects(decryptLetter(other, ID_A, ciphertext, iv));
});

test("letter key must be exactly 32 bytes", async () => {
  await assert.rejects(importLetterKey(toBase64(new Uint8Array(16))));
});

test("bytea hex encoding round-trips", () => {
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  assert.deepEqual(fromPgBytea(toPgBytea(bytes)), bytes);
  assert.ok(toPgBytea(bytes).startsWith("\\x"));
});

test("email hashes ignore case and whitespace, and depend on the secret", async () => {
  const k = await hmacKey(SECRET);
  assert.equal(await emailHash(k, " Juan@Gmail.com "), await emailHash(k, "juan@gmail.com"));
  assert.notEqual(await emailHash(k, "juan@gmail.com"), await emailHash(k, "juana@gmail.com"));
  const k2 = await hmacKey(SECRET + "x");
  assert.notEqual(await emailHash(k, "juan@gmail.com"), await emailHash(k2, "juan@gmail.com"));
});

test("rotating event codes verify, then expire", async () => {
  const k = await hmacKey(SECRET);
  const t0 = 1_800_000_000;
  const code = await makeEventCode(k, "rotating", ID_A, t0);
  assert.deepEqual(await parseEventCode(k, code, t0 + 60), { kind: "rotating", eventId: ID_A, issuedAt: t0 });
  assert.deepEqual(await parseEventCode(k, code, t0 + ROTATING_TTL_SECONDS + 1), { error: "expired" });
  assert.deepEqual(await parseEventCode(k, code, t0 - 600), { error: "expired" }, "future-dated codes are rejected");
});

test("static event codes verify without expiry", async () => {
  const k = await hmacKey(SECRET);
  const code = await makeEventCode(k, "static", ID_A);
  assert.deepEqual(await parseEventCode(k, code, 9_999_999_999), { kind: "static", eventId: ID_A });
});

test("forged or altered event codes are rejected", async () => {
  const k = await hmacKey(SECRET);
  const code = await makeEventCode(k, "rotating", ID_A, 1_800_000_000);
  const parts = code.split(".");
  // Change the event, keep the signature.
  const otherId = (await makeEventCode(k, "rotating", ID_B, 1_800_000_000)).split(".")[1];
  assert.deepEqual(await parseEventCode(k, [parts[0], otherId, parts[2], parts[3]].join("."), 1_800_000_000), { error: "invalid" });
  // Extend the timestamp, keep the signature.
  assert.deepEqual(await parseEventCode(k, [parts[0], parts[1], (1_900_000_000).toString(36), parts[3]].join("."), 1_900_000_000), { error: "invalid" });
  // Signed with another secret.
  const k2 = await hmacKey(SECRET + "x");
  assert.deepEqual(await parseEventCode(k2, code, 1_800_000_000), { error: "invalid" });
  assert.deepEqual(await parseEventCode(k, "garbage", 1_800_000_000), { error: "invalid" });
});

test("signed links check purpose, expiry and signature", async () => {
  const k = await hmacKey(SECRET);
  const now = 1_800_000_000;
  const token = await signLink(k, { p: "cancel", id: ID_A, exp: now + 3600 });
  assert.equal((await verifyLink(k, token, "cancel", now))?.id, ID_A);
  assert.equal(await verifyLink(k, token, "unsubscribe", now), null, "wrong purpose");
  assert.equal(await verifyLink(k, token, "cancel", now + 3601), null, "expired");
  const [body] = token.split(".");
  assert.equal(await verifyLink(k, `${body}.AAAA`, "cancel", now), null, "bad signature");
});

test("submit schema enforces the brief's limits", () => {
  const base = {
    subject: "Hello",
    body: "Dear me",
    email: "Juan@Gmail.com ",
    deliverAt: new Date(Date.now() + 400 * 86_400_000).toISOString(),
    consent: true,
    policyVersion: "2026-11-12",
  };
  const ok = letterSubmitSchema.safeParse(base);
  assert.ok(ok.success);
  assert.equal(ok.data?.email, "juan@gmail.com");
  assert.ok(!letterSubmitSchema.safeParse({ ...base, body: "x".repeat(20_001) }).success, "max 20,000 chars");
  assert.ok(!letterSubmitSchema.safeParse({ ...base, consent: false }).success, "consent required");
  assert.ok(!letterSubmitSchema.safeParse({ ...base, email: "not-an-email" }).success);
});

test("delivery window is 1 month to 25 years", () => {
  const now = new Date(2026, 10, 12, 12);
  assert.ok(!isDeliverAtAllowed(new Date(2026, 10, 20), now), "8 days is too soon");
  assert.ok(isDeliverAtAllowed(new Date(2026, 11, 12, 9), now), "1 month is fine");
  assert.ok(isDeliverAtAllowed(new Date(2051, 10, 12, 9), now), "25 years is fine");
  assert.ok(!isDeliverAtAllowed(new Date(2051, 11, 20), now), "over 25 years is not");
});
