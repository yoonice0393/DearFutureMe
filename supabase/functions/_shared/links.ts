/**
 * Signed links in emails. Opening a link never changes anything by itself
 * (mail scanners open links automatically); the page asks for a click.
 */
import { env, keys, siteOrigins } from "./env.ts";
import { signLink } from "./tokens.ts";

const DAY = 86_400;
const now = () => Math.floor(Date.now() / 1000);
const site = () => siteOrigins()[0];

/** Manage / cancel / "This wasn't me": valid until 30 days after delivery. */
export async function manageToken(letterId: string, deliverAt: Date): Promise<string> {
  return signLink(await keys.link(), { p: "manage", id: letterId, exp: Math.floor(deliverAt.getTime() / 1000) + 30 * DAY });
}

export async function manageUrl(letterId: string, deliverAt: Date, action?: "not-me"): Promise<string> {
  const t = await manageToken(letterId, deliverAt);
  return `${site()}/manage/${t}${action ? `?action=${action}` : ""}`;
}

/** Unsubscribe is tied to the address (email hash), so it keeps working after letters are gone. */
export async function unsubscribeToken(emailHash: string): Promise<string> {
  return signLink(await keys.link(), { p: "unsubscribe", id: emailHash, exp: now() + 30 * 365 * DAY });
}

export async function unsubscribeUrl(emailHash: string): Promise<string> {
  return `${site()}/manage/${await unsubscribeToken(emailHash)}?action=unsubscribe`;
}

/** RFC 8058 one-click endpoint, called directly by mail clients. */
export async function oneClickUnsubscribeUrl(emailHash: string): Promise<string> {
  return `${env("SUPABASE_URL")}/functions/v1/unsubscribe?t=${await unsubscribeToken(emailHash)}`;
}

/** Web flow without sign-in: confirm the address within 24 hours. */
export async function verifyUrl(letterId: string): Promise<string> {
  const t = await signLink(await keys.link(), { p: "verify", id: letterId, exp: now() + DAY });
  return `${site()}/verify?token=${t}`;
}

export const writeBackUrl = () => `${site()}/write`;
export const siteUrl = () => site();
