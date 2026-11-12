import { FunctionsHttpError } from "@supabase/supabase-js";

import { letterSubmitSchema, type LetterSubmit } from "@shared/letter.ts";
import { supabase, supabaseConfigured } from "./supabase";

export type ApiError = { ok: false; error: string; code?: string; field?: string };
export type ApiResult<T> = ({ ok: true } & T) | ApiError;

async function call<T>(fn: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  if (!supabase) return { ok: false, code: "not_configured", error: "The server isn't set up yet." };
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (!error) return data as ApiResult<T>;
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = (await error.context.json()) as ApiError;
      return { ...payload, ok: false };
    } catch {
      /* fall through */
    }
  }
  return {
    ok: false,
    code: "network",
    error: navigator.onLine
      ? "We couldn't reach the server. Please try again."
      : "You're offline. Check the connection and try again. Your letter is still here.",
  };
}

// ── Letters ──────────────────────────────────────────────────────────────────

export type SubmitResult =
  | { ok: true; status: "sealed" | "pending_verification"; deliverAt: string; letterId?: string }
  | ApiError;

export async function submitLetter(input: LetterSubmit): Promise<SubmitResult> {
  const parsed = letterSubmitSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  if (!supabaseConfigured) {
    // Local stand-in so the UI can be developed without a backend.
    await new Promise((r) => setTimeout(r, 600));
    const status = input.kioskToken || input.eventCode ? "sealed" : "pending_verification";
    return { ok: true, status, deliverAt: parsed.data.deliverAt };
  }
  return call("submit-letter", parsed.data);
}

export const saveDraft = (d: { id?: string; subject: string; body: string }) =>
  call<{ id: string; savedAt: string }>("save-draft", d);

export type OpenedLetter = {
  id: string;
  subject: string;
  body: string;
  status: string;
  deliverAt: string | null;
  createdAt: string;
  deliveredAt: string | null;
  email: string | null;
};
export const readLetter = (id: string) => call<OpenedLetter>("read-letter", { id });

// ── Booth and events ─────────────────────────────────────────────────────────

export type KioskInfo = { eventName?: string; presets?: number[]; startsAt?: string; endsAt?: string };

export const registerKiosk = (eventSlug: string, pin: string, label?: string) =>
  call<KioskInfo & { token: string }>("kiosk", { action: "register", eventSlug, pin, label });

export const kioskStatus = (kioskToken: string) =>
  call<KioskInfo & { usable: boolean; live: boolean }>("kiosk", { action: "status", kioskToken });

export const issueEventCode = (kioskToken: string, kind: "rotating" | "static") =>
  call<{ code: string; eventName: string; live: boolean; refreshInSeconds: number | null; expiresAt: string }>(
    "event-code",
    { kioskToken, kind },
  );

export const eventStatus = (eventCode: string) =>
  call<{ valid: boolean; reason?: string; eventName?: string; presets?: number[]; expiresAt?: string }>(
    "event-status",
    { eventCode },
  );
