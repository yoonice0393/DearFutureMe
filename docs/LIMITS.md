# Free-tier limits

_Checked: 2026-11-12. Figures come from third-party pricing summaries and Cloudflare's limits docs. **Re-check the official pricing pages before launch**, because these numbers change._

| Service | Free limit | Does it break the design? |
|---|---|---|
| **Supabase** | 500 MB database, 1 GB file storage, 5 GB egress, 500,000 Edge Function invocations/month, 50,000 MAU, 2 active projects. **Pauses after 7 days of inactivity.** No automatic backups. | No, with the mitigations below. One encrypted letter is at most ~30 KB (20k chars + overhead), and most are 2–5 KB, so 500 MB holds tens of thousands of letters. Hourly cron is ~720 invocations/month. |
| **Brevo** (primary) | **300 emails/day** (shared by transactional and marketing). API keys are **deactivated after 90 days without a successful call**. Inactive free accounts can be deleted. | Partly: busy event days (see below). The 90-day rule is handled by a daily keep-alive call and a monthly status email. |
| **Resend** (optional second provider) | 100 emails/day, 3,000/month, 1 verified domain. Only used if `RESEND_API_KEY` is set. | Adds 100/day of headroom. Needs your own domain. |
| **Cloudflare Pages** | 500 builds/month, 1 concurrent build, 20-min build timeout, unlimited static bandwidth/requests. | No. |
| **Cloudflare Turnstile** | Free, unlimited challenges. | No. (Confirm the per-account widget count; we only need 1–2.) |
| **GitHub Actions** | Free on public repos; 2,000 min/month on private. | No. Keep-alive and backup jobs use < 30 min/month. |

## Email volume (the real risk)
Each booth/event letter triggers **one receipt now** and **one delivery later**.

- **Event day:** 300 attendees means 300 receipts, which uses up Brevo's entire free day.
- **Delivery day:** everyone who picked "1 year" at the same event is due on the same date.

**Mitigations built into the app:**
1. Every send goes through `email_outbox` and a `daily_quota` counter per provider. Brevo is used first, then Resend if configured (~400/day together).
2. Receipts have priority: letter deliveries may use at most 80% of a provider's day. When the quota is used up, emails wait until the next UTC day (`next_attempt_at`), and those attempts don't count toward a letter's 3 tries.
3. Each event's `submission_cap` defaults to **300**.

**Operational rule:** for an event expected to exceed ~250 letters in a day, upgrade Brevo for that month (the Starter plan removes the daily cap) or add Resend with a verified domain.

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

## Brevo account rules
- **API key inactivity (90 days):** the daily `maintenance` job makes an authenticated read call to Brevo, and on the 1st of each month the app emails a status report to `ADMIN_EMAIL` (default: the sender address). Brevo also emails you 7 days before deactivating a key, and a deactivated key can be reactivated under SMTP & API.
- **If the key stops working anyway:** letters stay queued and are not marked failed; they go out once the key works again.
- **Inactive free accounts** can be deleted by Brevo. The monthly email counts as activity, but log in every month or two.
- **Sender without a domain:** sending from a Gmail address works for testing but often lands in Spam or is rejected (DMARC). Use your own domain before the event.

Sources: https://help.brevo.com/hc/en-us/articles/209467485 , https://help.brevo.com/hc/en-us/articles/4410311028626
