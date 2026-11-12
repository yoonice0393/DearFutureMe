/**
 * Email templates: table layout + inline styles for email clients, plain-text
 * twins for every message. Everything a user typed goes through escapeHtml().
 * Pure functions (no Deno APIs) so they're unit-tested in Node.
 */

const C = {
  paper: "#F6F1E7",
  sheet: "#FBF8F1",
  ink: "#1F2A37",
  pencil: "#5B6472",
  postal: "#B3261E",
  rule: "#D9CFBC",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only our own https/http links ever go into href attributes. */
function safeUrl(url: string): string {
  if (!/^https?:\/\//i.test(url)) throw new Error("refusing non-http(s) URL in email");
  return escapeHtml(url);
}

export function formatDate(d: Date, timeZone = "Asia/Manila"): string {
  try {
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone });
  } catch {
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
}

/** Plain text → paragraphs, preserving single line breaks. */
function paragraphs(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 1.2em 0;font-family:${SERIF};font-size:18px;line-height:1.65;color:${C.ink};">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function button(href: string, label: string): string {
  return `<a href="${safeUrl(href)}" style="display:inline-block;background:${C.postal};color:#ffffff;font-family:${SANS};font-size:16px;font-weight:600;text-decoration:none;padding:14px 24px;border-radius:2px;">${escapeHtml(label)}</a>`;
}

function link(href: string, label: string): string {
  return `<a href="${safeUrl(href)}" style="color:${C.postal};text-decoration:underline;">${escapeHtml(label)}</a>`;
}

function layout(opts: { preheader: string; sheet: string; footer: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>DearFutureMe</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
    <tr><td style="padding:0 0 16px 0;font-family:${SERIF};font-size:20px;color:${C.ink};">Dear<i>Future</i>Me</td></tr>
    <tr><td style="background:${C.sheet};border:1px solid ${C.rule};padding:40px 32px;">${opts.sheet}</td></tr>
    <tr><td style="padding:24px 4px 0 4px;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.pencil};">${opts.footer}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function footer(unsubscribeUrl: string): string {
  return `You're getting this because a letter was written to this address on DearFutureMe.<br>
${link(unsubscribeUrl, "Stop all letters to this address")}`;
}

// ── Receipt (sent right after sealing) ──────────────────────────────────────

export function receiptEmail(o: {
  arrives: string;
  manageUrl: string;
  notMeUrl: string;
  unsubscribeUrl: string;
  eventName?: string | null;
}) {
  const where = o.eventName ? ` at ${o.eventName}` : "";
  const subject = `Your letter is sealed. It arrives on ${o.arrives}`;
  const html = layout({
    preheader: `Sealed${where}. It arrives on ${o.arrives}.`,
    sheet: `
      <p style="margin:0 0 8px 0;font-family:${SANS};font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:${C.pencil};">Receipt</p>
      <h1 style="margin:0 0 24px 0;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:normal;color:${C.ink};">Your letter is sealed.</h1>
      <p style="margin:0 0 24px 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};">
        You wrote a letter to your future self${escapeHtml(where)}. We'll email it to this address on
        <strong>${escapeHtml(o.arrives)}</strong>. Until then, it stays encrypted and nobody reads it.</p>
      <p style="margin:0 0 32px 0;">${button(o.manageUrl, "Manage or cancel this letter")}</p>
      <p style="margin:0;padding-top:24px;border-top:1px dashed ${C.rule};font-family:${SANS};font-size:14px;line-height:1.6;color:${C.pencil};">
        <strong style="color:${C.ink};">Didn't write this?</strong> Someone may have typed your address by mistake.
        ${link(o.notMeUrl, "This wasn't me")}: we'll cancel it and won't send anything to this address again.</p>`,
    footer: `Keep a copy of anything important. Email is best-effort over years.<br>${footer(o.unsubscribeUrl)}`,
  });
  const text = `Your letter is sealed.

You wrote a letter to your future self${where}. We'll email it to this address on ${o.arrives}. Until then, it stays encrypted.

Manage or cancel this letter: ${o.manageUrl}

Didn't write this? This wasn't me (cancel and stop all mail): ${o.notMeUrl}

Stop all letters to this address: ${o.unsubscribeUrl}`;
  return { subject, html, text };
}

// ── Verification (web flow without sign-in) ─────────────────────────────────

export function verifyEmail(o: { verifyUrl: string; arrives: string; unsubscribeUrl: string }) {
  const subject = "Confirm your email to seal your letter";
  const html = layout({
    preheader: "One click and your letter is sealed.",
    sheet: `
      <h1 style="margin:0 0 24px 0;font-family:${SERIF};font-size:28px;line-height:1.25;font-weight:normal;color:${C.ink};">One last step.</h1>
      <p style="margin:0 0 24px 0;font-family:${SANS};font-size:16px;line-height:1.6;color:${C.ink};">
        Confirm this is your address and we'll seal your letter for <strong>${escapeHtml(o.arrives)}</strong>.
        This link works for 24 hours.</p>
      <p style="margin:0 0 32px 0;">${button(o.verifyUrl, "Confirm and seal my letter")}</p>
      <p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.pencil};">
        Didn't write a letter? Ignore this email and nothing will be sent.</p>`,
    footer: footer(o.unsubscribeUrl),
  });
  const text = `One last step.

Confirm this is your address and we'll seal your letter for ${o.arrives}. This link works for 24 hours:
${o.verifyUrl}

Didn't write a letter? Ignore this email and nothing will be sent.

Stop all letters to this address: ${o.unsubscribeUrl}`;
  return { subject, html, text };
}

// ── The letter itself ───────────────────────────────────────────────────────

export function letterEmail(o: {
  subject: string;
  body: string;
  writtenOn: string;
  deliveredOn: string;
  eventName?: string | null;
  writeBackUrl: string;
  unsubscribeUrl: string;
}) {
  const postmark = `${o.eventName ? `Written at ${o.eventName} on` : "Written on"} ${o.writtenOn} · Delivered on ${o.deliveredOn}`;
  const html = layout({
    preheader: `A letter from you, written on ${o.writtenOn}.`,
    sheet: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${SERIF};font-size:15px;color:${C.pencil};">${escapeHtml(o.writtenOn)}</td>
        <td align="right" style="font-family:${SANS};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${C.postal};">
          <span style="display:inline-block;border:2px solid ${C.postal};border-radius:999px;padding:8px 12px;">Delivered ${escapeHtml(o.deliveredOn)}</span></td>
      </tr></table>
      <div style="height:32px;line-height:32px;">&nbsp;</div>
      ${paragraphs(o.body)}`,
    footer: `<p style="margin:0 0 16px 0;padding-top:12px;border-top:1px dashed ${C.rule};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;text-align:center;">${escapeHtml(postmark)}</p>
      <p style="margin:0 0 16px 0;font-size:15px;color:${C.ink};">${link(o.writeBackUrl, "Write back to your future self")}</p>
      ${footer(o.unsubscribeUrl)}`,
  });
  const text = `${o.writtenOn}

${o.body.trim()}

—
${postmark}

Write back to your future self: ${o.writeBackUrl}
Stop all letters to this address: ${o.unsubscribeUrl}`;
  return { subject: o.subject, html, text };
}

// ── Monthly heartbeat to the operator ───────────────────────────────────────

export function heartbeatEmail(o: { sealed: number; failed: number; queued: number; nextDelivery: string | null; providers: Record<string, string> }) {
  const subject = `DearFutureMe status: ${o.failed ? `${o.failed} failed letter(s)` : "all good"}`;
  const lines = [
    `Letters waiting: ${o.sealed}`,
    `Failed letters needing a look: ${o.failed}`,
    `Emails queued: ${o.queued}`,
    `Next delivery: ${o.nextDelivery ?? "none scheduled"}`,
    `Providers: ${Object.entries(o.providers).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
  ];
  const html = layout({
    preheader: lines[0],
    sheet: `<h1 style="margin:0 0 16px 0;font-family:${SERIF};font-size:24px;font-weight:normal;color:${C.ink};">Monthly status</h1>
      ${lines.map((l) => `<p style="margin:0 0 8px 0;font-family:${SANS};font-size:15px;color:${C.ink};">${escapeHtml(l)}</p>`).join("")}`,
    footer: "Sent once a month so the email key stays active. No letter content is included.",
  });
  return { subject, html, text: `Monthly status\n\n${lines.join("\n")}` };
}
