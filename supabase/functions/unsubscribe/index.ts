/**
 * RFC 8058 one-click unsubscribe: mail clients POST here directly
 * (List-Unsubscribe-Post: List-Unsubscribe=One-Click). No page, no JSON.
 * GET does nothing, because link scanners must never unsubscribe anyone.
 */
import { db } from "../_shared/db.ts";
import { keys } from "../_shared/env.ts";
import { log } from "../_shared/http.ts";
import { verifyLink } from "../_shared/tokens.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Use the unsubscribe button in your email app, or the link at the bottom of the email.", {
      status: 405,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const payload = token ? await verifyLink(await keys.link(), token, "unsubscribe") : null;
  if (!payload) return new Response("Invalid or expired link.", { status: 400 });

  const { data, error } = await db().rpc("suppress_email", { p_email_hash: payload.id, p_reason: "unsubscribe" });
  if (error) {
    log("unsubscribe", "error", { message: error.message });
    return new Response("Something went wrong. Please try again.", { status: 500 });
  }
  log("unsubscribe", "one_click", { removed: data });
  return new Response("You're unsubscribed. We won't send anything to this address again.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
});
