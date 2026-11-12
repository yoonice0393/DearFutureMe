/**
 * Letter rules shared by the browser (Vite) and the Edge Functions (Deno).
 * Keep this file dependency-light: only `zod`, which both runtimes resolve
 * (node_modules in Vite, the deno.json import map in Deno).
 */
import { z } from "zod";

export const LETTER_MAX_CHARS = 20_000;
export const SUBJECT_MAX_CHARS = 150;
export const EMAIL_MAX_CHARS = 254;
export const MIN_MONTHS_AHEAD = 1;
export const MAX_YEARS_AHEAD = 25;

/** Delivery presets in months. */
export const DELIVERY_PRESETS = [6, 12, 24, 36, 60, 120] as const;
export type PresetMonths = (typeof DELIVERY_PRESETS)[number];

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp (e.g. 31 Jan + 1 month -> 28/29 Feb).
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/** Earliest and latest allowed delivery instants, relative to `now`. */
export function deliveryBounds(now: Date = new Date()) {
  const min = addMonths(now, MIN_MONTHS_AHEAD);
  min.setHours(0, 0, 0, 0);
  const max = addMonths(now, MAX_YEARS_AHEAD * 12);
  max.setHours(23, 59, 59, 999);
  return { min, max };
}

/** Server-side check. Allows a day of clock skew either side. */
export function isDeliverAtAllowed(deliverAt: Date, now: Date = new Date()): boolean {
  const { min, max } = deliveryBounds(now);
  const DAY = 86_400_000;
  const t = deliverAt.getTime();
  return t >= min.getTime() - DAY && t <= max.getTime() + DAY;
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_CHARS, "That email address is too long.")
  .pipe(z.email("That doesn't look like an email address."));

export const letterContentSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(1, "Give your letter a subject.")
    .max(SUBJECT_MAX_CHARS, `Keep the subject under ${SUBJECT_MAX_CHARS} characters.`),
  body: z
    .string()
    .trim()
    .min(1, "Your letter is empty.")
    .max(LETTER_MAX_CHARS, `Letters can be up to ${LETTER_MAX_CHARS.toLocaleString("en")} characters.`),
});

export const letterSubmitSchema = letterContentSchema.extend({
  email: emailSchema,
  deliverAt: z.iso.datetime({ offset: true }),
  timezone: z.string().max(64).optional(),
  consent: z.literal(true, { error: "Please agree to the Terms and Privacy Policy." }),
  policyVersion: z.string().min(1).max(32),
  /** Set by the booth/event flows; validated server-side. */
  kioskToken: z.string().max(128).optional(),
  eventCode: z.string().max(256).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

export type LetterSubmit = z.infer<typeof letterSubmitSchema>;

export function defaultSubject(writtenOn: Date = new Date()): string {
  const date = writtenOn.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `A letter from you, written on ${date}`;
}
