# Free-tier limits

_Checked: 2026-11-12. Figures come from third-party pricing summaries and Cloudflare's limits docs. **Re-check the official pricing pages before launch**, because these numbers change._

| Service | Free limit | Does it break the design? |
|---|---|---|
| **Supabase** | 500 MB database, 1 GB file storage, 5 GB egress, 500,000 Edge Function invocations/month, 50,000 MAU, 2 active projects. **Pauses after 7 days of inactivity.** No automatic backups. | No, with the mitigations below. One encrypted letter is at most ~30 KB (20k chars + overhead), and most are 2–5 KB, so 500 MB holds tens of thousands of letters. Hourly cron is ~720 invocations/month. |
| **Resend** | **100 emails/day** (UTC reset, `429 daily_quota_exceeded`), 3,000/month, 1 verified domain, 30-day log retention. | **Yes, at busy events.** See "Email volume" below. |
| **Brevo** (fallback) | ~300 emails/day | Used as a second provider. |
| **Cloudflare Pages** | 500 builds/month, 1 concurrent build, 20-min build timeout, unlimited static bandwidth/requests. | No. |
| **Cloudflare Turnstile** | Free, unlimited challenges. | No. (Confirm the per-account widget count; we only need 1–2.) |
| **GitHub Actions** | Free on public repos; 2,000 min/month on private. | No. Keep-alive and backup jobs use < 30 min/month. |

## Email volume (the real risk)
Each booth/event letter triggers **one receipt now** and **one delivery later**.

- **Event day:** 300 attendees means 300 receipts, which exceeds Resend's 100/day.
- **Delivery day:** everyone who picked "1 year" at the same event is due on the same date.

**Mitigations built into the app:**
1. Every send goes through `email_outbox` and a `daily_quota` counter per provider. When Resend hits its cap, the sender switches to Brevo. Together they give ~400/day.
2. Receipts have priority over deliveries. If both providers are exhausted, deliveries move to the next UTC day (`next_attempt_at`). The Terms describe delivery as best-effort, and a 1–2 day slip on a years-long letter is acceptable.
3. Each event's `submission_cap` defaults to **300**.

**Operational rule:** for an event expected to exceed ~300 letters in a day, upgrade Resend to **Pro ($20/month, 50,000 emails)** for that month and the delivery month, or raise the Brevo plan. The admin page will show remaining quota for the day.

## Supabase pausing
Free projects pause after 7 days without activity. If the project pauses, **cron stops and letters are not delivered until someone restores it** in the dashboard. No data is lost.

Keep-alive strategy (both are in place):
1. The hourly `pg_cron` job calls the `send-due` Edge Function over HTTP through `pg_net`. That is real API traffic every hour.
2. A GitHub Actions scheduled workflow (`.github/workflows/keepalive.yml`) calls the `health` function, which runs a trivial DB query, once a day. It fails loudly (GitHub emails the repo owner) if the project is unreachable, so a pause is noticed within a day.

## Backups
The free plan has no backups. `.github/workflows/backup.yml` runs `pg_dump` weekly and stores the encrypted dump as a private workflow artifact (30-day retention, matching the deletion promise in the Privacy Policy). Letter bodies are already AES-encrypted in the dump. The encryption key lives only in Supabase secrets plus your own offline copy. **Keep an offline copy of `LETTER_KEY`, because without it the backups can't be read.**

## Sources
- Supabase: https://automationatlas.io/answers/supabase-free-tier-limits-2026/ , https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/
- Resend: https://www.activepieces.com/blog/resend-pricing-2026-free-tier-plans-and-limits , https://superdupr.com/blog/resend-pricing
- Cloudflare Pages: https://developers.cloudflare.com/pages/platform/limits
- Official pages to confirm: https://supabase.com/pricing , https://resend.com/pricing , https://www.brevo.com/pricing , https://developers.cloudflare.com/turnstile/
