import { readJSON } from "@/lib/storage";

/**
 * Booth device registration, written by /booth/setup (Phase 4).
 * Device config only: it never contains anything an attendee typed.
 */
export type KioskConfig = {
  token: string;
  eventName: string;
  registeredAt: string;
};

export const KIOSK_KEY = "dfm-kiosk";

export function readKiosk(): KioskConfig | null {
  const k = readJSON<KioskConfig>(KIOSK_KEY);
  if (k?.token) return k;
  // Development convenience until /booth/setup exists.
  if (import.meta.env.DEV) {
    return { token: "dev-kiosk", eventName: "Dev Booth", registeredAt: new Date().toISOString() };
  }
  return null;
}
