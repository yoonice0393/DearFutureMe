/** "1 year, 3 months" / "12 days" / "today": calendar-aware, coarsest two units. */
export function countdown(to: Date, now = new Date()): string {
  if (to.getTime() <= now.getTime()) return "any moment now";
  let months = (to.getFullYear() - now.getFullYear()) * 12 + (to.getMonth() - now.getMonth());
  let anchor = new Date(now);
  anchor.setMonth(now.getMonth() + months);
  if (anchor > to) {
    months -= 1;
    anchor = new Date(now);
    anchor.setMonth(now.getMonth() + months);
  }
  const days = Math.floor((to.getTime() - anchor.getTime()) / 86_400_000);
  const years = Math.floor(months / 12);
  const m = months % 12;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  const parts: string[] = [];
  if (years) parts.push(plural(years, "year"));
  if (m) parts.push(plural(m, "month"));
  if (!years && days) parts.push(plural(days, "day"));
  if (!parts.length) return days ? plural(days, "day") : "today";
  return parts.slice(0, 2).join(", ");
}
