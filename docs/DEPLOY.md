# Deploying DearFutureMe

Three parts, all on free plans:

| Part | Where | How it deploys |
|---|---|---|
| Website (`dist/`) | Cloudflare Workers (static assets) | Automatically on every push to `main` on GitHub |
| Database, Edge Functions, cron | Supabase | From this machine with the Supabase CLI |
| Email | Brevo (Resend optional) | API key stored as a Supabase secret |

Run CLI commands in **Command Prompt** (`cmd`). PowerShell often blocks `npx`.

---

## 1. Supabase (backend)

Already done for the current project. For a new project, or after changes:

```bat
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --remote
node scripts/gen-secrets.mjs            :: only once per project, never overwrite
npx supabase secrets set --env-file supabase/.env.secrets
npx supabase functions deploy --use-api
node scripts/rls-remote.mjs             :: RLS tests, always rolled back
```

Set these in the **Supabase dashboard → Edge Functions → Secrets** (or add them to `supabase/.env.secrets`):

| Secret | Value |
|---|---|
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys (restricted: Transactional emails read/write) |
| `MAIL_FROM_EMAIL` | The verified Brevo sender |
| `MAIL_FROM_NAME` | `DearFutureMe` |
| `ADMIN_EMAIL` | Optional: who gets the monthly status email (defaults to the sender) |
| `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → your widget → Secret key |
| `SITE_ORIGINS` | `https://dearfutureme.pages.dev,http://localhost:5173` (first one is used in email links) |
| `DEV_MODE` | `false` in production (turns off the dev-only "send now" button) |

**Cron.** The migrations create the jobs. Each project also needs two Vault secrets, run once in the SQL editor:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'dfm_project_url');
select vault.create_secret('<same value as CRON_SECRET>', 'dfm_cron_secret');
```

Check that the jobs are scheduled with `select jobname, schedule, active from cron.job;`.

**Auth.** Go to **Authentication → URL Configuration**:
- Site URL: `https://dearfutureme.pages.dev`
- Redirect URLs: `https://dearfutureme.pages.dev/**`, `http://localhost:5173/**`

**Bot check on sign-in (recommended).** Go to **Authentication → Attack Protection**, enable CAPTCHA, choose Turnstile, and paste the Turnstile secret key.

**Sign-in emails through Brevo (recommended).** Supabase's built-in mailer allows only a few emails per hour. Go to **Authentication → Emails → SMTP Settings**:
- Host `smtp-relay.brevo.com`, port `587`
- Username: the SMTP login shown in Brevo → SMTP & API → SMTP
- Password: a Brevo **SMTP key** (not the API key)
- Sender: your verified sender address

**First admin.** Run this in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

---

## 2. Cloudflare (website)

The site is a **Cloudflare Worker with static assets**: no server code, it just serves `dist/`. `wrangler.jsonc` in the repo configures it, so wrangler never auto-configures the project. (A classic Pages project also works with the same build. Use output directory `dist`.)

1. Cloudflare dashboard → **Workers & Pages → Create → Workers → Import a repository**.
2. Authorise GitHub and pick the `DearFutureMe` repository.
3. Build settings:
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
4. **Build variables** (Settings → Build → *Variables and secrets*). They must be *build* variables, because Vite bakes them in at build time:

   | Name | Value |
   |---|---|
   | `NODE_VERSION` | `22` |
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the `sb_publishable_…` key |
   | `VITE_TURNSTILE_SITE_KEY` | Turnstile site key |
   | `VITE_CONTACT_EMAIL` | the public contact address shown in the footer |

   These are public values, baked into the JavaScript at build time. **Never** put a service key, `LETTER_KEY` or the Brevo key here.
5. **Deploy.** Your site is `https://dearfutureme.<your-subdomain>.workers.dev` (shown on the Worker's overview page). Use that exact address everywhere below.

The build writes `dist/_headers` (CSP, HSTS and the other headers) and prerenders the static pages. Cloudflare serves `/about` from `about.html` and every unknown path from `index.html`, so client-side routing works. Every push to `main` redeploys.

### After the first deploy

- [ ] Add the site address to the Supabase secret `SITE_ORIGINS` (first in the list), then run `npx supabase secrets set --env-file supabase/.env.secrets`.
- [ ] Supabase Auth Site URL and Redirect URLs point at the site address.
- [ ] Turnstile widget hostnames include the site address (`dearfutureme.<subdomain>.workers.dev`).
- [ ] Open `/booth/setup` on the real site and register a test device, then check `/booth`, `/booth/qr` and a phone scan.
- [ ] Write a web letter to yourself, confirm it, and check the receipt's links (manage, "This wasn't me").
- [ ] Response headers: `curl -sI https://<site>/ | findstr /i "content-security strict-transport"`.
- [ ] Set `DEV_MODE=false` before the real event.

---

## 3. GitHub Actions (keep-alive and backups)

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Used by | Value |
|---|---|---|
| `SUPABASE_URL` | keep-alive | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | keep-alive | the `sb_publishable_…` key |
| `SUPABASE_DB_URL` | backup | Supabase → **Connect → Session pooler** connection string, with the database password filled in |
| `BACKUP_PASSPHRASE` | backup | a long random passphrase, kept in your password manager |

Then **Actions → Keep Supabase awake → Run workflow** to test it. Run the backup the same way. Its encrypted file appears under the run's *Artifacts* for 30 days.

Restore a backup:

```bash
gpg -d backup.sql.gz.gpg | gunzip | psql "<connection string>"
```

**Keep `LETTER_KEY` offline** (in a password manager or on paper). Backups contain only ciphertext, so without the key nobody, including you, can read the letters in them.

---

## 4. Custom domain (later)

1. Buy a domain (about ₱500–700/year). Add it in **Cloudflare Pages → Custom domains** and follow the DNS prompts (instant if the domain uses Cloudflare DNS).
2. Replace `dearfutureme.pages.dev` everywhere above: `SITE_ORIGINS`, Supabase Auth URLs, Turnstile hostnames.
3. **Email from your domain** (fixes Gmail spam and Yahoo rejections):
   - Brevo → Senders, Domains → **Add domain**, then add the DNS records it lists: Brevo code (TXT), **DKIM** (CNAME/TXT), and **DMARC**, for example `v=DMARC1; p=none; rua=mailto:you@yourdomain`.
   - If you also use another sender, merge the SPF records into **one** `v=spf1 … ~all` TXT record.
   - Verify in Brevo, then change `MAIL_FROM_EMAIL` to an address on the domain, for example `letters@yourdomain`.
4. Update the contact email (`VITE_CONTACT_EMAIL`) and redeploy.

---

## Before an event

- [ ] Real Turnstile keys in place (not the `1x000…` test keys).
- [ ] `DEV_MODE=false`.
- [ ] Event created in `/admin` with a letter cap that fits the email quota (Brevo free: 300/day, see `docs/LIMITS.md`).
- [ ] Every booth device registered at `/booth/setup`, and `/booth/qr` open on a screen.
- [ ] A test letter from a booth device and one from a phone, with receipts arriving.
- [ ] The keep-alive workflow passed in the last 24 hours.
