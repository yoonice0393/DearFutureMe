/**
 * Letter encryption: AES-256-GCM with a random 96-bit IV per write.
 *
 * The letter id is bound in as additional authenticated data (AAD), so a
 * ciphertext copied onto another row fails to decrypt instead of quietly
 * showing someone else's letter. The key lives in Supabase secrets
 * (LETTER_KEY, base64 of 32 random bytes), never in the database.
 */
import { fromBase64, fromUtf8, utf8 } from "./encoding.ts";

export type LetterContent = { subject: string; body: string };

export const CURRENT_KEY_VERSION = 1;

export async function importLetterKey(base64Key: string): Promise<CryptoKey> {
  const raw = fromBase64(base64Key.trim());
  if (raw.length !== 32) throw new Error("LETTER_KEY must be 32 bytes (base64)");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function aad(letterId: string, keyVersion: number): Uint8Array {
  return utf8.encode(`dfm-letter:${letterId}:v${keyVersion}`);
}

export async function encryptLetter(
  key: CryptoKey,
  letterId: string,
  content: LetterContent,
  keyVersion = CURRENT_KEY_VERSION,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = utf8.encode(JSON.stringify({ s: content.subject, b: content.body }));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(letterId, keyVersion) },
    key,
    plaintext,
  );
  return { ciphertext: new Uint8Array(ct), iv };
}

export async function decryptLetter(
  key: CryptoKey,
  letterId: string,
  ciphertext: Uint8Array,
  iv: Uint8Array,
  keyVersion = CURRENT_KEY_VERSION,
): Promise<LetterContent> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: aad(letterId, keyVersion) },
    key,
    ciphertext,
  );
  const parsed = JSON.parse(fromUtf8.decode(pt)) as { s: string; b: string };
  return { subject: parsed.s, body: parsed.b };
}
