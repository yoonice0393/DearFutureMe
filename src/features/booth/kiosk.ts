import { supabaseConfigured } from "@/lib/supabase";
import { readJSON, removeKey, writeJSON } from "@/lib/storage";

/**
 * Booth device registration, written by /booth/setup.
 * Device config only: it never contains anything an attendee typed.
 */
export type KioskConfig = {
  token: string;
  eventName: string;
  label?: string;
  registeredAt: string;
};

export const KIOSK_KEY = "dfm-kiosk";
export const DEV_KIOSK_TOKEN = "dev-kiosk";

export function readKiosk(): KioskConfig | null {
  const k = readJSON<KioskConfig>(KIOSK_KEY);
  if (k?.token) return k;
  // Without a backend (UI development only), pretend this is a registered booth.
  if (import.meta.env.DEV && !supabaseConfigured) {
    return { token: DEV_KIOSK_TOKEN, eventName: "Dev Booth", registeredAt: new Date().toISOString() };
  }
  return null;
}

export const saveKiosk = (k: KioskConfig) => writeJSON(KIOSK_KEY, k);
export const clearKiosk = () => removeKey(KIOSK_KEY);
