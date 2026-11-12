/**
 * POST /health: a cheap DB round-trip. Called daily by the GitHub Actions
 * keep-alive so the free project doesn't pause, and fails loudly if it has.
 */
import { db } from "../_shared/db.ts";
import { serve } from "../_shared/http.ts";

serve("health", async () => {
  const { error } = await db().from("events").select("id", { head: true, count: "exact" }).limit(1);
  if (error) throw error;
  return { status: "ok", at: new Date().toISOString() };
});
