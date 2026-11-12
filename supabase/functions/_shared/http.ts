/** Request/response plumbing shared by every Edge Function. */
import { siteOrigins } from "./env.ts";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = siteOrigins();
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Never log letter content or full email addresses. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${(local ?? "").slice(0, 1)}***@${domain ?? "?"}`;
}

export function log(fn: string, event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ fn, event, ...data }));
}

/** Best-effort client IP (Supabase sits behind a proxy). Used only hashed, for rate limits. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Wraps a handler: CORS preflight, method check, JSON parsing, uniform errors.
 * Unexpected errors are logged without request bodies and returned as 500.
 */
export function serve(name: string, handler: (req: Request, body: Record<string, unknown>) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(req) });
    if (req.method !== "POST") return json(req, 405, { ok: false, code: "method", error: "Use POST." });
    try {
      const text = await req.text();
      if (text.length > 64_000) throw new HttpError(413, "too_large", "That request is too large.");
      let body: Record<string, unknown> = {};
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          throw new HttpError(400, "bad_json", "Invalid request.");
        }
      }
      const result = await handler(req, body);
      return json(req, 200, { ok: true, ...(result as object) });
    } catch (err) {
      if (err instanceof HttpError) {
        return json(req, err.status, { ok: false, code: err.code, error: err.message, field: err.field });
      }
      // Zod validation failures are the caller's fault, not ours.
      if (err && typeof err === "object" && Array.isArray((err as { issues?: unknown }).issues)) {
        const issue = (err as { issues: { message: string; path: PropertyKey[] }[] }).issues[0];
        return json(req, 400, { ok: false, code: "invalid", error: issue?.message ?? "Invalid request.", field: String(issue?.path?.[0] ?? "") });
      }
      log(name, "error", { message: err instanceof Error ? err.message : String(err) });
      return json(req, 500, { ok: false, code: "server", error: "Something went wrong on our side. Please try again." });
    }
  });
}
