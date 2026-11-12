/**
 * POST /save-draft { id?, subject, body } (signed-in users only)
 * Encrypts and upserts a draft so it follows the user across devices.
 */
import { z } from "zod";

import { LETTER_MAX_CHARS, SUBJECT_MAX_CHARS } from "../_shared/letter.ts";
import { CURRENT_KEY_VERSION, encryptLetter } from "../_shared/crypto.ts";
import { db, rateLimit, requireUser } from "../_shared/db.ts";
import { toPgBytea } from "../_shared/encoding.ts";
import { keys } from "../_shared/env.ts";
import { HttpError, serve } from "../_shared/http.ts";

const MAX_DRAFTS = 20;

const schema = z.object({
  id: z.uuid().optional(),
  subject: z.string().max(SUBJECT_MAX_CHARS),
  body: z.string().max(LETTER_MAX_CHARS),
});

serve("save-draft", async (req, raw) => {
  const user = await requireUser(req);
  const input = schema.parse(raw);
  await rateLimit("draft", user.id, 3600, 300, "Saving too often. Your draft is still safe on this device.");

  if (input.id) {
    const { data: existing, error } = await db()
      .from("letters")
      .select("id")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .eq("status", "draft")
      .maybeSingle();
    if (error) throw error;
    if (!existing) throw new HttpError(404, "not_found", "That draft no longer exists.");
  } else {
    const { count, error } = await db()
      .from("letters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "draft");
    if (error) throw error;
    if ((count ?? 0) >= MAX_DRAFTS) throw new HttpError(409, "draft_limit", `You can keep up to ${MAX_DRAFTS} drafts.`);
  }

  const id = input.id ?? crypto.randomUUID();
  const { ciphertext, iv } = await encryptLetter(await keys.letter(), id, { subject: input.subject, body: input.body });
  const row = {
    body_ciphertext: toPgBytea(ciphertext),
    body_iv: toPgBytea(iv),
    key_version: CURRENT_KEY_VERSION,
  };

  const { error } = input.id
    ? await db().from("letters").update(row).eq("id", id).eq("user_id", user.id).eq("status", "draft")
    : await db().from("letters").insert({ id, user_id: user.id, source: "web", status: "draft", ...row });
  if (error) throw error;

  return { id, savedAt: new Date().toISOString() };
});
