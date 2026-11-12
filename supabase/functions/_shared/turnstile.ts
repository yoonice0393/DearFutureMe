/**
 * Cloudflare Turnstile server-side check.
 * Until TURNSTILE_SECRET_KEY is set (Phase 7) this is a no-op, so local
 * development works without a widget. Once set, `required` paths must send a token.
 */
import { optionalEnv } from "./env.ts";
import { HttpError, clientIp, log } from "./http.ts";

export async function verifyTurnstile(token: string | undefined, req: Request, opts: { required: boolean }) {
  const secret = optionalEnv("TURNSTILE_SECRET_KEY");
  if (!secret) return;
  if (!token) {
    if (!opts.required) return;
    throw new HttpError(400, "turnstile", "Please complete the quick check that you're not a bot.");
  }
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  form.append("remoteip", clientIp(req));
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
  if (!data.success) {
    log("turnstile", "failed", { codes: data["error-codes"] });
    throw new HttpError(400, "turnstile", "The bot check didn't go through. Please try again.");
  }
}
