/** Public, non-secret settings. Anything here ends up in the browser bundle. */
export const SITE_NAME = "DearFutureMe";

export const CONTACT_EMAIL: string =
  import.meta.env.VITE_CONTACT_EMAIL || "privacy@dearfutureme.example";

/** Bump when Privacy Policy or Terms change materially; stored with each consent. */
export const POLICY_VERSION = "2026-11-12";
export const POLICY_UPDATED_LABEL = "12 November 2026";

export const MAX_LETTER_CHARS = 20_000;
export { MAX_LETTERS_PER_EMAIL } from "@shared/letter.ts";
export const DELETION_WINDOW_DAYS = 30;
export const DELIVERED_RETENTION_DAYS = 90;
