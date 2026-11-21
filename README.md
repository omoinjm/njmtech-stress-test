# NJM Tech Security: website security & stress check

Live at **https://security.njmtech.co.za** (Cloudflare Worker + D1). Emails come from `security@send.njmtech.co.za` (Resend); payments go through Yoco.

Business owners scan **their own** website, online store or web app. They get a **teaser report**: a security score, every issue by title and severity, **one full fix free**, and the rest blurred. A "Request full report & quote" form sends you the lead. You see the **full report** (evidence + fixes, PDF export) in `/admin`.

## How it works

1. **Free public scan, instant**: the visitor enters their site and email on the landing page. No sign-up, no verification.
   Only **public** checks run, meaning what any visitor's browser already receives (homepage response, TLS handshake, public DNS).
   The report link carries an unguessable token (`/scans/{id}?t=…`) and is emailed to them.
   Rate limits: 10 per IP, 10 per email, and 5 per target host per day (so it can't be used to recon one site).
2. **Teaser report**: score, every issue by severity, one full fix free, the rest blurred. Redaction happens on the server.
3. **Deep scan + stress test** (probing checks + 50-user load test) needs a **one-click owner approval**:
   - **Email approval (recommended):** a link sent to `admin@`, `administrator@`, `webmaster@`, `hostmaster@` or `postmaster@` at the
     registrable domain (the CA/Browser Forum "constructed email" method). If the account email is already one of
     those, the domain is verified automatically on sign-in. There is no setup step.
   - **Fallback:** DNS TXT `_njmtech-verify.<host>` or the file `/.well-known/njmtech-security-verify.txt`.
   - Verification lasts 30 days.
4. **Pay to unlock** (Yoco, default R499 via `REPORT_PRICE_CENTS`): every finding with evidence and fixes, plus PDF export.
5. **Pay for fixes**: the customer requests a quote, you set a fixed price in `/admin`, and they get an email and a pay button.
   Payments are confirmed server-side; the browser redirect is never trusted.

Each check is tagged `public` or `deep` in `lib/scanner/check-keys.ts`:

| Check | Looks for |
|---|---|
| `tls` | no HTTPS, missing http→https redirect, expired/expiring/untrusted cert, TLS 1.0/1.1 |
| `headers` | HSTS, CSP, clickjacking, nosniff, Referrer-Policy, Permissions-Policy |
| `cookies` | missing Secure / HttpOnly / SameSite |
| `exposed-files` *(deep)* | `.env`, `.git`, SQL/zip backups, phpinfo, server-status, directory listing (content-signature matched, so no soft-404 false positives) |
| `cms` | generator version, jQuery < 3.5 (from the homepage only) |
| `wordpress` *(deep)* | WordPress user enumeration, XML-RPC |
| `cors` *(deep)* | reflected origin + credentials, wildcard |
| `email-dns` | SPF / DMARC missing or `p=none` (invoice-fraud spoofing) |
| `mixed-content` | `http://` resources on HTTPS pages |
| `info-leak` | versioned `Server`, `X-Powered-By` |
| load test *(deep, opt-in)* | ramps to ≤50 users, ≤30 s, ≤3000 requests, auto-aborts at >20% errors, 1 per site per day |

The free finding is the **most severe DIY-friendly** one (e.g. a missing redirect or header). Critical issues stay as the paid work. To change finding text, edit `lib/findings/catalog.ts`. To add a check, add a file in `lib/scanner/checks/`, register it in `lib/scanner/index.ts`, and add its key to `lib/scanner/check-keys.ts`.

## Safety / abuse controls
- Probing/load only after owner approval; the public scan is passive; terms checkbox; account + IP logged per scan
- SSRF guard: targets resolving to private/loopback/metadata IPs are refused (`lib/scanner/net.ts`)
- Rate limits: 5 scans/user/day, 10/IP/day, one running scan per site, 1 load test/site/day; 5 magic links/email/hour
- Load-test caps are clamped in code and can't be raised by callers; the load test step never auto-retries

## Architecture (Cloudflare)
- **Next.js 16 on Workers** via `@opennextjs/cloudflare`; `worker.ts` re-exports the OpenNext handler plus two Workflow classes.
- **D1** (`DB`): Drizzle ORM (`lib/db/schema.ts`), SQL migrations in `drizzle/`.
- **Cloudflare Workflows**: `ScanWorkflow` runs each check as a durable step. The stress test fans out to 9 `LoadShardWorkflow`
  instances (Workers allow 6 open connections per invocation), staggered to ramp from 6 to 50 users.
- `global_fetch_strictly_public` blocks the Worker from fetching private/internal IPs (an SSRF backstop on top of `lib/scanner/net.ts`).
- On Workers, certificate expiry comes from `node:tls` when available, otherwise from Certificate Transparency logs (crt.sh).

## Local development
```bash
cp .dev.vars.example .dev.vars && cp .env.example .env.local   # fill SESSION_SECRET (+ keys from Infisical)
pnpm db:migrate:local      # local D1 (.wrangler/state)
pnpm dev                   # next dev on :3000 (scans run in-process; Workflows aren't available under next dev)
pnpm preview               # real Workers runtime + Workflows on :8787
```
Without `RESEND_API_KEY`, emails print to the console. Sign in with an email listed in `ADMIN_EMAILS` to get `/admin`.

### Tests
```bash
pnpm test                                             # unit: checks, redaction, SSRF, load caps/shards, Yoco webhook signatures
node --env-file=.env.local scripts/e2e.mjs [--load]   # full flow vs. a running app (E2E_BASE=http://localhost:8787 for preview)
pnpm weak-server                                      # deliberately misconfigured site on :4010
```
To E2E-test the Worker build locally against the localhost test site, run `wrangler dev --compatibility-flags nodejs_compat`
(this drops `global_fetch_strictly_public`, which otherwise blocks localhost).

## Deploying
Secrets live in Infisical (`env-vault` project, `/njmtech-security` folder) and are pushed to the Worker with `wrangler secret put`:
`SESSION_SECRET`, `RESEND_API_KEY`, `YOCO_SECRET_KEY`, `YOCO_WEBHOOK_SECRET`, and `ADMIN_EMAILS` (a secret so it stays out of
this public repo). Plain vars (`APP_URL`, `EMAIL_FROM`, `REPORT_PRICE_CENTS`) are in `wrangler.jsonc`.
```bash
wrangler d1 create njmtech-security          # put the id in wrangler.jsonc
pnpm db:migrate:remote
pnpm deploy                                  # builds + deploys to security.njmtech.co.za
```
Yoco webhook: register `https://security.njmtech.co.za/api/webhooks/yoco` (`POST https://payments.yoco.com/api/webhooks`)
and store the returned `whsec_…` as `YOCO_WEBHOOK_SECRET`. **Only do this on NJM Tech's own Yoco account.** The current
test key is shared with the wealth-board client sites, and Yoco sends every event to every webhook on an account. Until
then, payments are confirmed when the customer returns: `/payments/return` reads the checkout status from Yoco's API.

Email: Resend domain `send.njmtech.co.za` (eu-west-1, verified; DNS records in Cloudflare are tagged "Resend"). The Worker's
`RESEND_API_KEY` is send-only and restricted to that domain.

## Not in v1
Scheduled re-scans · server-side PDF generation (it currently uses the browser's print-to-PDF) · refunds UI.
