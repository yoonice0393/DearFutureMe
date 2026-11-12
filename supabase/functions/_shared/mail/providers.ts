/**
 * Email providers. Brevo first (300/day free), Resend second if configured.
 * Each send reserves one unit of the provider's daily quota in the database
 * first, so parallel functions can't overshoot the free-tier cap.
 */
import { db } from "../db.ts";
import { optionalEnv } from "../env.ts";
import { log, maskEmail } from "../http.ts";

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  tag: "receipt" | "verify" | "letter" | "heartbeat";
  /** Stable id for providers that support idempotency (Resend). */
  idempotencyKey?: string;
};

export type SendResult =
  | { ok: true; provider: string; messageId: string }
  | {
      ok: false;
      /** Provider unavailable (bad/deactivated key, quota, outage): not the letter's fault. */
      providerDown: boolean;
      /** Worth retrying at all (false = e.g. the address is invalid). */
      retryable: boolean;
      error: string;
      retryAt?: string;
    };

type ProviderResult = SendResult | { ok: false; providerDown: true; retryable: true; error: string };

type Provider = {
  name: string;
  dailyLimit: number;
  send: (m: Mail) => Promise<ProviderResult>;
};

function sender() {
  const email = optionalEnv("MAIL_FROM_EMAIL");
  if (!email) throw new Error("MAIL_FROM_EMAIL is not set");
  return { email, name: optionalEnv("MAIL_FROM_NAME") ?? "DearFutureMe" };
}

function classify(status: number, body: string, provider: string): ProviderResult {
  const error = `${provider} ${status}: ${body.slice(0, 300)}`;
  if (status === 401 || status === 402 || status === 403 || status === 429) {
    return { ok: false, providerDown: true, retryable: true, error };
  }
  if (status >= 500) return { ok: false, providerDown: false, retryable: true, error };
  return { ok: false, providerDown: false, retryable: false, error }; // 400-ish: bad address etc.
}

const brevo = (apiKey: string): Provider => ({
  name: "brevo",
  dailyLimit: Number(optionalEnv("BREVO_DAILY_LIMIT") ?? 300),
  async send(m) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: sender(),
        to: [{ email: m.to }],
        subject: m.subject,
        htmlContent: m.html,
        textContent: m.text,
        headers: m.headers,
        tags: [m.tag],
      }),
    });
    const body = await res.text();
    if (res.ok) {
      const id = (JSON.parse(body || "{}") as { messageId?: string }).messageId ?? "";
      return { ok: true, provider: "brevo", messageId: id };
    }
    return classify(res.status, body, "brevo");
  },
});

const resend = (apiKey: string): Provider => ({
  name: "resend",
  dailyLimit: Number(optionalEnv("RESEND_DAILY_LIMIT") ?? 100),
  async send(m) {
    const from = sender();
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: `${from.name} <${from.email}>`,
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: m.headers,
        tags: [{ name: "kind", value: m.tag }],
      }),
    });
    const body = await res.text();
    if (res.ok) return { ok: true, provider: "resend", messageId: (JSON.parse(body) as { id?: string }).id ?? "" };
    return classify(res.status, body, "resend");
  },
});

export function providers(): Provider[] {
  const list: Provider[] = [];
  const b = optionalEnv("BREVO_API_KEY");
  if (b) list.push(brevo(b));
  const r = optionalEnv("RESEND_API_KEY");
  if (r) list.push(resend(r));
  return list;
}

function nextUtcDay(): string {
  const d = new Date();
  d.setUTCHours(24, 5, 0, 0);
  return d.toISOString();
}

/**
 * Send through the first provider with quota left. Letters may use at most 80%
 * of a provider's day so event-day receipts still get through.
 */
export async function sendMail(m: Mail): Promise<SendResult> {
  const list = providers();
  if (!list.length) {
    return { ok: false, providerDown: true, retryable: true, error: "No email provider configured" };
  }
  let lastError = "";
  let allFull = true;
  for (const p of list) {
    const limit = m.tag === "letter" ? Math.floor(p.dailyLimit * 0.8) : p.dailyLimit;
    const { data: reserved, error } = await db().rpc("quota_take", { p_provider: p.name, p_limit: limit });
    if (error) throw error;
    if (!reserved) {
      lastError = `${p.name}: daily quota reached`;
      continue;
    }
    allFull = false;
    const result = await p.send(m);
    if (result.ok) {
      log("mail", "sent", { provider: p.name, tag: m.tag, to: maskEmail(m.to) });
      return result;
    }
    log("mail", "provider_error", { provider: p.name, tag: m.tag, error: result.error });
    if (result.providerDown) {
      await db().rpc("quota_release", { p_provider: p.name });
      lastError = result.error;
      continue; // try the next provider
    }
    return result; // the message itself is the problem
  }
  return {
    ok: false,
    providerDown: true,
    retryable: true,
    error: lastError,
    retryAt: allFull ? nextUtcDay() : new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}

/** Harmless authenticated read: keeps the Brevo key from the 90-day inactivity rule. */
export async function pingProviders(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const b = optionalEnv("BREVO_API_KEY");
  if (b) {
    const res = await fetch("https://api.brevo.com/v3/smtp/statistics/aggregatedReport?days=1", {
      headers: { "api-key": b, accept: "application/json" },
    });
    out.brevo = res.ok ? "ok" : `error ${res.status}`;
    await res.body?.cancel();
  }
  return out;
}
