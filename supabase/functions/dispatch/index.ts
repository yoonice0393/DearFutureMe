/**
 * POST /dispatch { job }: called only by pg_cron (x-cron-secret header).
 *   outbox       every 5 min  receipts, verification links, heartbeat
 *   letters      hourly       letters whose delivery time has come
 *   maintenance  daily        retention, Brevo key keep-alive, monthly heartbeat
 */
import { z } from "zod";

import { db } from "../_shared/db.ts";
import { deliverDueLetters, processOutbox } from "../_shared/delivery.ts";
import { env } from "../_shared/env.ts";
import { HttpError, log, serve } from "../_shared/http.ts";
import { pingProviders } from "../_shared/mail/providers.ts";
import { safeEqual } from "../_shared/tokens.ts";

const schema = z.object({ job: z.enum(["outbox", "letters", "maintenance"]) });

serve("dispatch", async (req, raw) => {
  const secret = req.headers.get("x-cron-secret") ?? "";
  if (!safeEqual(secret, env("CRON_SECRET"))) throw new HttpError(401, "auth", "Not allowed.");
  const { job } = schema.parse(raw);

  if (job === "outbox") {
    const result = await processOutbox({ limit: 50 });
    log("dispatch", "outbox", result);
    return result;
  }

  if (job === "letters") {
    const result = await deliverDueLetters(100_000);
    // Receipts that piled up behind the quota go out too.
    const outbox = await processOutbox({ limit: 50 });
    log("dispatch", "letters", { ...result, outbox });
    return { ...result, outbox };
  }

  // maintenance
  const { data: retention, error } = await db().rpc("run_retention");
  if (error) throw error;
  const providers = await pingProviders(); // keeps the Brevo key out of the 90-day inactivity rule
  let heartbeat = false;
  if (new Date().getUTCDate() === 1) {
    const { error: hbErr } = await db().from("email_outbox").insert({ kind: "heartbeat" });
    if (hbErr) throw hbErr;
    await processOutbox({ limit: 5 });
    heartbeat = true;
  }
  log("dispatch", "maintenance", { retention, providers, heartbeat });
  return { retention, providers, heartbeat };
});
