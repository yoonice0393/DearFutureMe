import { addMonths, deliveryBounds, type PresetMonths } from "@shared/letter.ts";

export type Delivery =
  | { kind: "preset"; months: PresetMonths }
  | { kind: "custom"; date: string /* yyyy-mm-dd, local */ };

/** Letters go out at 09:00 local time on the chosen day. */
const DELIVERY_HOUR = 9;

export function presetLabel(months: number): string {
  if (months < 12) return `${months} months`;
  const y = months / 12;
  return y === 1 ? "1 year" : `${y} years`;
}

export function toInputDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fromInputDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), DELIVERY_HOUR);
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(m[3]) ? null : d;
}

export function inputDateBounds(now = new Date()) {
  const { min, max } = deliveryBounds(now);
  return { min: toInputDate(min), max: toInputDate(max) };
}

/** Resolve a delivery choice to a concrete instant, or null if invalid/out of range. */
export function resolveDelivery(delivery: Delivery | null, now = new Date()): Date | null {
  if (!delivery) return null;
  if (delivery.kind === "preset") {
    const d = addMonths(now, delivery.months);
    d.setHours(DELIVERY_HOUR, 0, 0, 0);
    return d;
  }
  const d = fromInputDate(delivery.date);
  if (!d) return null;
  const { min, max } = deliveryBounds(now);
  return d >= min && d <= max ? d : null;
}

export function customDateError(value: string, now = new Date()): string | null {
  if (!value) return "Pick a date.";
  const d = fromInputDate(value);
  if (!d) return "That date doesn't look right.";
  const { min, max } = deliveryBounds(now);
  if (d < min) return "Choose a date at least one month from today.";
  if (d > max) return "Choose a date no more than 25 years from today.";
  return null;
}

export function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function userTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}
