/**
 * POST /read-letter { id } (signed-in owner only)
 * Decrypts a letter for its owner. Letters the owner chose to "seal shut"
 * stay unreadable until they're delivered.
 */
import { z } from "zod";

import { decryptLetter } from "../_shared/crypto.ts";
import { db, requireUser } from "../_shared/db.ts";
import { fromPgBytea } from "../_shared/encoding.ts";
import { keys } from "../_shared/env.ts";
import { HttpError, serve } from "../_shared/http.ts";

const schema = z.object({ id: z.uuid() });

serve("read-letter", async (req, raw) => {
  const user = await requireUser(req);
  const { id } = schema.parse(raw);

  const { data: letter, error } = await db()
    .from("letters")
    .select("id, body_ciphertext, body_iv, key_version, status, is_sealed, deliver_at, created_at, delivered_at, recipient_email")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  // Same answer for "not yours" and "doesn't exist".
  if (!letter) throw new HttpError(404, "not_found", "We couldn't find that letter.");
  if (letter.is_sealed && letter.status !== "delivered") {
    throw new HttpError(403, "sealed", "You sealed this letter shut. It opens on delivery day.");
  }

  const content = await decryptLetter(
    await keys.letter(),
    letter.id,
    fromPgBytea(letter.body_ciphertext),
    fromPgBytea(letter.body_iv),
    letter.key_version,
  );
  return {
    id: letter.id,
    ...content,
    status: letter.status,
    deliverAt: letter.deliver_at,
    createdAt: letter.created_at,
    deliveredAt: letter.delivered_at,
    email: letter.recipient_email,
  };
});
