# DearFutureMe

Write a letter to your future self; it's emailed back on the date you choose.
Built for event booths (shared kiosks and attendees' phones) as well as the open web.

- **Frontend:** React + Vite + TypeScript + Tailwind (`src/`)
- **Backend:** Supabase Postgres + Auth + Edge Functions (`supabase/`)
- **Design system:** `docs/DESIGN.md` · **Free-tier limits:** `docs/LIMITS.md`

## Local setup

Requires Node 20+ (developed on Node 26).

```bash
npm install
cp .env.example .env.local      # then fill in the VITE_* values
npm run dev                     # http://localhost:5173
```

Without `.env.local`, the app runs on local stand-ins: booth and event pages work,
and "sealing" a letter only pretends to submit. That's useful for UI work.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build into `dist/` |
| `npm test` | Unit tests for encryption, signed tokens and letter rules |
| `node scripts/rls-remote.mjs` | RLS tests against the linked database, no Docker needed (always rolled back) |

## Environment variables

**Browser (`.env.local`, bundled publicly):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
(the publishable key), `VITE_TURNSTILE_SITE_KEY`, `VITE_CONTACT_EMAIL`.

**Server only (Supabase secrets, never in the bundle):**

| Secret | Purpose |
|---|---|
| `LETTER_KEY` | AES-256-GCM key for letter content. **Keep an offline copy.** Losing it makes letters unreadable. |
| `LINK_SECRET` | Signs event QR codes and manage/cancel/unsubscribe links |
| `EMAIL_HASH_SECRET` | HMAC for email addresses used in rate limits |
| `SITE_ORIGINS` | Allowed site origin(s), comma-separated |
| `DEV_MODE` | `true` enables the dev "send now" path (Phase 5) |
| `RESEND_API_KEY`, `BREVO_API_KEY`, `TURNSTILE_SECRET_KEY` | Added in later phases |

`SUPABASE_URL` and the service key are injected by Supabase automatically.

## Backend setup (Supabase)

Run these in **Command Prompt** (`cmd`). PowerShell often blocks `npx` with
"running scripts is disabled on this system".

```bat
cd C:\path\to\DearFutureMe
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --remote
node scripts/gen-secrets.mjs
npx supabase secrets set --env-file supabase/.env.secrets
npx supabase functions deploy --use-api
node scripts/rls-remote.mjs
```

In the dashboard, under **Authentication → URL Configuration**, set the Site URL and add
`http://localhost:5173/**` to the redirect URLs, so magic links come back to the app.

### Create an event and register a booth

In the dashboard **SQL editor**:

```sql
select public.create_event(
  'Campus Fair 2026', 'campus-fair-2026',
  '2026-11-20 08:00+08', '2026-11-22 20:00+08',
  '482913',   -- staff PIN, 6–12 digits
  300         -- letter cap for the event
);
```

On each booth device, open `/booth/setup`, enter `campus-fair-2026` and the PIN, then open
`/booth`. For attendees' phones, open `/booth/qr` on a registered device and point it at the crowd.

## How letters are protected

- Subject and body are encrypted in the Edge Function (AES-256-GCM, letter id bound as AAD).
  The database only stores ciphertext.
- RLS is on for every table. Browsers can read only their own profile and letters. Every write
  goes through an Edge Function. See `supabase/tests/database/rls.test.sql`.
- Kiosk tokens are random and stored as SHA-256 hashes. Event QR codes are HMAC-signed and short-lived.
- Per-email, per-event and per-kiosk limits are enforced atomically in `create_letter()`.
