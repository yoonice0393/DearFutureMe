import { letterSubmitSchema, type LetterSubmit } from "@shared/letter.ts";

export type SubmitResult =
  | { ok: true; status: "sealed" | "pending_verification"; deliverAt: string }
  | { ok: false; error: string; field?: string };

/**
 * Phase 3 stand-in. Validates with the shared schema and pretends to succeed.
 * Phase 4 replaces the body with a call to the `submit-letter` Edge Function.
 */
export async function submitLetter(input: LetterSubmit): Promise<SubmitResult> {
  const parsed = letterSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  await new Promise((r) => setTimeout(r, 600));
  const status = input.kioskToken || input.eventCode ? "sealed" : "pending_verification";
  return { ok: true, status, deliverAt: parsed.data.deliverAt };
}
