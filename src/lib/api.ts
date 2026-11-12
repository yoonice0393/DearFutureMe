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

// ── Email links ──────────────────────────────────────────────────────────────

export const verifyEmail = (token: string) =>
  call<{ status: string; deliverAt: string; already: boolean }>("verify", { token });

export type ManageView =
  | { kind: "unsubscribe" }
  | { kind: "letter"; exists: false }
  | {
      kind: "letter";
      exists: true;
      status: string;
      deliverAt: string;
      writtenAt: string;
      email: string;
      eventName: string | null;
      devSendNow: boolean;
    };

export const manageView = (token: string) => call<ManageView>("manage", { token, action: "view" });

export const manageAction = (token: string, action: "cancel" | "not-me" | "unsubscribe" | "send-now") =>
  call<{ done: boolean; removed?: number; status?: string; error?: string | null }>("manage", { token, action });

// ── Signed-in owner ──────────────────────────────────────────────────────────

export const claimLetters = () => call<{ claimed: number }>("my-letters", { action: "claim" });
export const cancelMyLetter = (id: string) => call<{ done: boolean }>("my-letters", { action: "cancel", id });
export const deleteMyLetter = (id: string) => call<{ done: boolean }>("my-letters", { action: "delete", id });
export const rescheduleMyLetter = (id: string, deliverAt: string) =>
  call<{ done: boolean; deliverAt: string }>("my-letters", { action: "reschedule", id, deliverAt });

export type ExportData = { exportedAt: string; account: Record<string, unknown>; letters: Record<string, unknown>[] };
export const exportMyData = () => call<ExportData>("account", { action: "export" });
export const retargetLetters = () => call<{ updated: number }>("account", { action: "retarget" });
export const deleteMyAccount = () => call<{ deleted: boolean }>("account", { action: "delete", confirm: "DELETE" });

// ── Staff ────────────────────────────────────────────────────────────────────

export type AdminOverview = {
  events: {
    event_id: string; name: string; slug: string; starts_at: string; ends_at: string; paused: boolean;
    submission_cap: number; static_code_cap: number; letters: number; booth: number; phone: number; via_static: number;
  }[];
  kiosks: { kiosk_id: string; event_id: string; label: string | null; active: boolean; created_at: string; revoked_at: string | null; letters: number }[];
  queue: Record<string, number>;
  failed: { id: string; attempts: number; last_error: string | null; deliver_at: string; source: string }[];
  quotaToday: { provider: string; used: number }[];
};
export const adminOverview = () => call<AdminOverview>("admin", { action: "overview" });
export const adminCreateEvent = (e: { name: string; slug: string; startsAt: string; endsAt: string; pin: string; cap: number; staticCap: number }) =>
  call<{ eventId: string }>("admin", { action: "create-event", ...e });
export const adminPauseEvent = (eventId: string, paused: boolean) => call<{ done: boolean }>("admin", { action: "pause-event", eventId, paused });
export const adminRevokeKiosk = (kioskId: string, cancelLetters: boolean) =>
  call<{ cancelled: number }>("admin", { action: "revoke-kiosk", kioskId, cancelLetters });
export const adminRetryFailed = (id: string) => call<{ done: boolean }>("admin", { action: "retry-failed", id });
