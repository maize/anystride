# Coaching marketplace: account and enquiry pilot

Sandbox follow-up: the runner-owned checkout and payment-gated private text
workspace are implemented and covered by 72 passing tests. Their code was deployed
September 13, 2026, but remains hard-disabled on Vercel Production and has not
passed provider-backed payment testing. See
[SANDBOX-MILESTONE.md](./SANDBOX-MILESTONE.md) for the isolated-environment setup
and remaining gates; the production account pilot below is unchanged.

## Closed-pilot setup

The `/account` area adds Supabase-managed sign in, verified-email checks, coach
applications, independent administrator review, reviewed service proposals and
private runner requests. Coaches can accept or decline an enquiry; runners can
withdraw it. These actions **do not purchase a service or grant paid coach access**.

The public coach directory is separate. No directory coach has been enrolled,
claimed, approved or assigned a payment destination automatically. Public plans,
progress, print and calendar exports remain available without an account.

Configuration defaults off. Missing configuration displays an honest unavailable
state and the API returns 503. Vercel already has Anystride Supabase settings;
we reuse that provider instead of adding a separate authentication service.
The installed SDK does not enable email delivery or apply authentication settings.

## Setup before inviting pilot users

1. Use the existing Anystride Supabase project. Enable email sign in, configure
   a working SMTP sender and abuse/rate controls, and allow the exact redirect
   `${MARKETPLACE_APP_URL}/account/callback`. The form requests an email link using
   Supabase's PKCE flow; open the link in the browser that requested it. Sign-in
   does not create users; the explicit sign-up form does. The callback exchanges
   only the one-time code and always returns to the fixed account origin. Set
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the
   intended environment. Neither a service-role secret nor a JWT secret belongs
   in the client. Configure Supabase's confirmation email redirect before testing.
2. Choose the database explicitly: set `MARKETPLACE_DATABASE_SOURCE=POSTGRES_URL`
   to reuse the existing Anystride Supabase database, or configure the dedicated
   `MARKETPLACE_DATABASE_URL`. There is no implicit write fallback. Set
   `MARKETPLACE_DATABASE_CA` to the provider's trusted PEM root if needed; remote
   TLS certificate and hostname verification always remain enabled. Review and explicitly
   run `db/migrations/002_marketplace.sql` against that database. Runtime handlers
   never create tables. Do not use the disposable Stripe test database for real
   user enquiries. The migration creates four tables and indexes, with no drops.
3. Set `MARKETPLACE_APP_URL` to one fixed trusted origin, without a path/query.
   Set `MARKETPLACE_ADMIN_USER_IDS` to exact Supabase user IDs controlled by the owner.
   Add an independent reviewer if an administrator also wants to coach; self-review
   is intentionally forbidden. Never infer administrator roles from email domains
   or client-editable metadata.
4. Set `MARKETPLACE_MODE=pilot` only in the intended pilot environment. Restart or
   redeploy after configuration. Keep `STRIPE_PAYMENTS_MODE=off` unless separately
   exercising the private payment harness described in [STRIPE.md](./STRIPE.md).
   For a closed pilot, set server-only `MARKETPLACE_PILOT_EMAILS` to the exact
   invited addresses. This is checked both before sending an email and after
   verifying an authenticated session, so an existing/direct Supabase login cannot
   bypass the invitation check. Invited emails do not receive administrator roles.
   An unset/blank list permits public pilot access; do not remove it before launch review.
5. Use separate coach, runner and reviewer test identities. Exercise the full
   browser journey, then verify the saved SQL records and audit entries. Check
   that an unrelated runner cannot retrieve or change requests, and an unverified
   email cannot submit. Do not add an authentication bypass for testing.

`npm run check:launch` reports missing variable **names**, never their values.
It is a read-only configuration report, not an API/database connectivity test.
It exits 2 deliberately: a live-payment release is not supported by this code.

## Workflow and security boundaries

- Supabase establishes identity; the route and data queries enforce ownership.
  Proxy only covers account and marketplace routes, not free public tools or
  signed Stripe webhooks. A fresh Auth-server `getUser()` lookup must return a
  verified, non-anonymous user. Proxy verifies/refreshes the session using
  `getClaims()`. Cookie storage is HTTP-only and Secure on HTTPS. No unverified
  `getSession()` result or user-editable role metadata authorizes a request.
- Every cookie-authenticated mutation requires JSON, the exact configured Origin,
  an authenticated actor and an allowlisted action/payload. Bodies are capped at
  8 KB. User IDs, administrator flags and payment destinations are never accepted.
- Coach applications and service proposals are immutable in this first pilot.
  Amendments need operator handling; there is no silent edit that bypasses review.
  A coach can propose up to ten services. New proposals await separate review.
- Review writes check the current version and are audited. Coach/service
  suspension hides offers and prevents new enquiries or acceptance. Previously
  accepted enquiries remain visible, but provide no payment or workspace access.
- Each enquiry stores the service description, proposed total price, currency,
  duration, coach name, review version and sharing-permission version at submission.
  The request is visible only to that runner and that coach. The admin review
  queue contains applications/services, not a bulk export of runner messages.
- Exact retries reuse IDs. Conflicting IDs and duplicate open enquiries return
  409. Per-user transaction locks protect quotas; runners can send ten new requests
  per rolling day. Multiple tabs/connections still need a hosted Postgres test.
- Row-level security is enabled on every marketplace table, with no browser-role
  policies. Server queries use a dedicated trusted database role; direct Data API
  requests cannot bypass ownership checks. Do not expose that connection string.
- Status transitions, data writes and audit entries commit atomically. A failed
  transaction is rolled back. There is no Stripe call from marketplace mutations.
- Account pages are noindex, use no-referrer, and omit analytics. Entry links use
  full document navigation so public-page analytics do not survive into sign in.
  Never add emails, session tokens or request bodies to URLs or logs.

## Verification on 2026-09-12

- Final check: all 46 tests, production build and lint pass; `npm audit` reports
  zero vulnerabilities. Next.js refreshed its generated `AGENTS.md` guidance when
  the upgraded local dev server started on port 3010.

- Automated tests include actual migrations and SQL transactions in disposable
  in-memory PGlite databases. Tests cover review, ownership, suspension, retry
  deduplication, request transitions and payment/refund persistence. Supabase identity
  and Stripe network responses are simulated; signature verification uses Stripe's
  actual SDK. This is **not** a completed provider-backed end-to-end payment test.
- Next.js upgraded from 16.2.6 to 16.3.5 with matching companion packages. Lint and
  the production build pass; `npm audit` reports zero vulnerabilities at this check.
  References: [release](https://github.com/vercel/next.js/releases/tag/v16.3.5),
  [patched image-optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).
- Local browser checks confirm the unavailable account state, no console errors
  and the neutral HTML payment return page. The local marketplace API returns
  503 while credentials are absent, without leaking data.
- Actual Supabase email sessions, deployed databases, simultaneous Postgres requests,
  authenticated browser forms and Stripe webhook delivery remain unverified.
- Follow-up on 2026-09-13: the existing Supabase project
  `gwwsxrtmlcnisnbphrfq` is healthy and linked to Anystride Preview and Production.
  These Vercel variables are Sensitive: empty CLI exports are not evidence that
  deployed provider configuration is missing. Do not rotate or downgrade secrets
  to make them readable locally. The owner-approved Site URL `https://anystride.com`
  and exact redirects `https://anystride.com/account/callback` and
  `http://localhost:3010/account/callback` were saved and verified in the dashboard.
  Actual login, SMTP delivery and database migrations remain unverified.
  `scripts/check-provider-readiness.mjs` can repeat this read-only check; it makes
  no signups, email sends or database writes. A legacy database, when configured,
  is queried only for schema presence, never used as an implicit write fallback.

## Remaining production work

### Reviewer email alerts

New coach applications and new service proposals now produce a server-only
notification reference after the record and its audit entry commit. The route
uses Next.js `after` to send a plain-text Resend email without delaying the
submission response. Exact form replays, failed transactions, reviews and runner
enquiries do not produce a new alert. Internal references are removed from the
API response. No migration is needed.

Set `MARKETPLACE_REVIEW_NOTIFICATIONS=email`, `MARKETPLACE_RESEND_API_KEY` (or the
legacy `RESEND_API_KEY` fallback), and an explicitly
verified `NOTIFY_FROM` sender in Production. `NOTIFY_EMAIL` defaults to the
owner-approved `matthias.e.link@gmail.com`; set it explicitly for operations.
Vercel Preview/Development deployments never send these reviewer alerts. The
feature defaults off and does not alter the older public application notifier.

Emails contain only a submission-type notice and the fixed signed-in review queue
link, not coach names, emails, biographies, credentials or runner information.
No sign-in code or administrative token is included. Requests have a five-second
timeout, reject redirects, validate the provider acknowledgement and use stable
per-item idempotency keys. Errors log generic diagnostic messages only.

This is best-effort notification, **not a durable outbox or delivery guarantee**.
There is no automatic retry worker or delivery/bounce tracking. A process crash
after the SQL commit, provider outage or failed mail can leave a saved application
without an email. Re-submitting the form does not resend it. The review queue is
authoritative and should still be checked. Resend's idempotency window is 24 hours;
do not assume it provides indefinite deduplication for future retry workers
([Resend documentation](https://resend.com/docs/dashboard/emails/idempotency-keys)).

Verification before activation: all 67 tests and lint pass.
Coverage includes SQL replay suppression, post-commit scheduling, private response
fields, disabled/preview/misconfigured send guards and provider/scheduling failures.
Email delivery is simulated in tests. After the owner signed in to Resend,
`anystride.com` was found with status "Not Started" (domain
`880c5440-2cfc-4d87-aaea-44397d46d0c6`). Its required DKIM TXT at
`resend._domainkey` and sending MX/TXT at `send` are absent from public DNS.
Authoritative nameservers are Gandi; Vercel does not manage the domain zone.
After owner login, the three records were added at Gandi with TTL 300. Public and
authoritative DNS confirmed their values, and Resend marked the domain verified.
Existing root MX/SPF, website A/CNAME, nameservers and previous DKIM records were
left unchanged. No optional receiving or tracking features were enabled.

A sending-only key named `Anystride reviewer alerts`, scoped to `anystride.com`,
was stored as Sensitive `MARKETPLACE_RESEND_API_KEY` in Production only. Existing
Resend keys and the legacy `RESEND_API_KEY` were not changed or revoked. Its value
was transferred in memory, never written to local files or printed, and the
temporary binding was cleared after setup. Production sender is
`Anystride <notifications@anystride.com>` and recipient is the owner-approved email.

One clearly labelled `[Test] Anystride reviewer alerts` message used the real
notification helper and restricted credential with diagnostic email content.
Resend reported **Delivered** for email `5a994a84-511c-4c00-8442-98d47f039651`.
No coach application, approval or service was created to test email. This proves
sender/API delivery, not the first complete production form-to-email journey.
The latter still requires a separate invited coach identity. Production alert
activation uses `MARKETPLACE_REVIEW_NOTIFICATIONS=email`; no commit or push.

The alert release `dpl_3cGonqYT7XvGTnT2dhvm83nDbNyE` built successfully and was
promoted to `https://anystride.com`. Pre-promotion checks confirmed anonymous
marketplace access is rejected (401) and checkout remains disabled (404).

On 2026-09-13, migration 002 was applied to the existing Anystride Supabase project.
SQL verified all four marketplace tables exist with row-level security enabled.
Explicit database selection, provider-CA support and closed-pilot invitation checks
were added; all 60 tests, lint and the production build passed. Production pilot
configuration is limited to the single owner-supplied test email. No administrator
was assigned and no coach was enrolled or approved by setup.

Email sign-in and email confirmation are enabled; anonymous sign-in is disabled.
Custom SMTP is not configured. Supabase's default sender supports project-team
testing only, not customer launch. Configure a custom sender before adding external
pilot users ([Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp)).
Provider-backed login and the authenticated dashboard read path are verified below.
Authenticated application/enquiry writes and the separate-role journey remain unverified.

The closed-pilot release was deployed and promoted to `https://anystride.com` as
`dpl_5kQumyuCeNT1nJBqS2XxjYndDBsk`. The live browser rendered the sign-up form;
one owner-authorized account-link request returned its neutral acknowledgement.
The owner subsequently completed the email link in the requesting in-app browser.
On a fresh navigation to `/account`, the authenticated dashboard loaded its requests,
approved-service catalog and coach application form without an account/database error.
The account had no requests, no coach application and no approved services available.
No reviewer controls appeared. This verifies provider-backed session authentication
and the production dashboard read path, not application/enquiry persistence or payment.
The unauthenticated marketplace API returned 401; account pages are private/no-store
and noindex. Customer checkout remains disabled (404), and the live event receiver
continues rejecting invalid signatures (400). No commit or push was performed.

Before public transactions: owner-approved payment responsibility, fees, service
and refund/cancellation terms; account-bound Connect onboarding; immutable paid
booking terms; checkout owned by the runner; signed webhook-driven access grants
and revocation; coach workspace/delivery and notifications; support/reconciliation
tools, data deletion/retention procedures, backups and monitoring. Decide how the
proposal price relates to fees and taxes before implementing public checkout.

Follow-up login recovery copy now explains browser/profile mismatch, reused or
expired links and temporary provider failures instead of asserting expiry. It offers
a fixed `/account` link for an already-signed-in user. Authentication, one-time code
exchange and security headers are unchanged. This follow-up is included in the
reviewer-activation release below.

With explicit owner approval, the exact verified, non-anonymous owner user ID was
added as the sole `MARKETPLACE_ADMIN_USER_IDS` entry in Production only. No editable
user metadata or email-derived role was used. Deployment
`dpl_DNwQjUtMqkkbDyz51EmvagHpXKFx` was built and promoted to `https://anystride.com`.
The signed-in browser rendered the Review queue with "Nothing to review yet."
All 61 tests and lint passed; the hosted production build is Ready. The staged
checkout returned its disabled 404, and callback recovery returned the expected
400 with the improved guidance. The deployment error-log scan returned no entries;
this is a point-in-time check, not ongoing monitoring.

Next pilot gate: use a separate, consenting coach identity for application and
service review; never self-approve or publish a synthetic production coach. Custom
SMTP is required before inviting users outside the Supabase project team. The
pilot remains restricted to the owner email and live payments remain disabled.

No live charging, real coach payout, coach enrollment, commit or push was performed.
The pilot deployment and owner-requested sign-in emails are described above.
