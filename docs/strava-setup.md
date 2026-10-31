# Strava connection beta

Athletes manage their connection and **explicit per-coach sharing** at `/account/connections`.
Sharing starts off, including for existing coaching relationships. The integration
does not copy API data into the permanent training calendar, mark assignments
complete, include it in exports, or send it to AI. User-selected CSV import is separate.

## Production configuration (2026-10-17)

The production application uses `https://anystride.com`, Strava client `176677`,
callback domain `anystride.com`, and production webhook subscription `377488`.
Strava currently permits ten athletes. The application keeps its more conservative
80 calls/15 minutes and 800 calls/day budgets despite the higher provider allowance.
The existing authorization was transferred to the owner's verified production
account; coach-sharing grants were not transferred. Production uses separate token
encryption, webhook, verification and worker secrets stored in Vercel.

Supabase `pg_cron` runs `public.strava_maintenance()` every fifteen minutes. Migration
015 enables private scheduler health tracking. Cleanup happens directly in SQL,
even if the HTTP worker is down. `pg_net` calls the fixed production worker URL only
when a job is ready and the global lease/rate-limit backoff permits it. The bearer
credential is read from Supabase Vault; it never appears in the scheduled command.
Five-day full-history refreshes keep six-day caches current. The worker stops
starting new jobs after thirty seconds and resumes remaining pages on later runs.
No Vercel plan upgrade, additional queue, polling service or paid scheduler is used.

Operational checks (database operator only):

```sql
SELECT last_tick, last_dispatch, last_status, last_response_at FROM strava_scheduler;
SELECT last_cleanup, window_calls, day_calls, blocked_until FROM strava_runtime;
SELECT schedule, active FROM cron.job WHERE jobname='anystride-strava-maintenance';
SELECT status, return_message, start_time FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname='anystride-strava-maintenance')
ORDER BY start_time DESC LIMIT 5;
```

`last_status` is collected on the next maintenance tick. Pending HTTP response
records are retained by pg_net for six hours by default; this job's cron history
is pruned after seven days. A stale `last_tick`/`last_cleanup` (over thirty minutes)
or non-200 worker response needs investigation. This is health evidence, not an
external alerting service. Keep SQL cleanup running if syncing is paused.

`release-strava.mjs` is an explicit build-time operator, never a public admin route.
Its `prepare` action is a guarded one-time transfer for this account; do not reuse
it for arbitrary users. `schedule` activates the job; `verify` runs HTTP/Auth/SQL
checks and removes only its tagged fixtures. Keep deployment build commands normal
outside these explicit operator runs. Remove one-time transfer settings immediately.

## Initial local setup (historical)

1. At https://www.strava.com/settings/api, create an application for Anystride.
   The developer needs a Strava subscription. New applications begin with one
   athlete; self-upgrade to ten in that dashboard when ready. This implementation
   also enforces a ten-account cap. Use a separate Strava app for development and
   production; each app supports one webhook subscription.
2. `node scripts/strava-setup.mjs init` creates `.env.strava.local` with private
   generated encryption, webhook, verification and cron secrets. It refuses to
   overwrite an existing file. This has already been run for this workspace.
   Add `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` to that file, never to chat or
   committed code. `node scripts/strava-setup.mjs status` prints only presence.
3. Apply migrations 008–014 to the selected marketplace database. Both local and production
   schemas are applied through migration 014. Existing account
   authentication and `TRAINING_WORKSPACE=on` must also be configured.
4. Set Strava's Authorization Callback Domain to your actual app hostname
   (for local development, `localhost`). The callback is
   `/api/strava/callback` on `MARKETPLACE_APP_URL`. Never register a coach account's
   callback or a third-party proxy service. An HTTPS deployment is required in production.
5. For local development, run `LOCAL_STRAVA=on node scripts/local-marketplace.mjs dev`.
   The opt-in passes **only** the Strava keys to the otherwise isolated local
   environment. Without it, the local runner disables external Strava calls.
   This is a live Strava connection to your chosen account, not a provider sandbox.
6. Provide a public HTTPS origin that reaches this application in
   `STRAVA_WEBHOOK_ORIGIN` (a developer-controlled tunnel can forward to port 3010).
   Set the same webhook and verification secrets on the running app. Then run
   `node scripts/strava-setup.mjs subscribe`. It verifies an existing matching
   subscription or creates one, saves its ID, and refuses to replace an unrelated
   subscription. It does not print secret callback URLs or credentials.
7. Set `STRAVA_SYNC=on`, load the saved subscription ID into the app environment,
   and restart. Open `/account/connections`, consent to access, then sign in on
   Strava. Private activities are an additional explicit opt-in.
8. Production is now configured as described above. Do not run the local
   subscription tool against the production Strava app or replace its webhook.
   Further live local development needs a separate Strava registration.

Historical local verification: the existing Stride AI registration was updated to **Anystride** on 2026-10-17,
with website `https://anystride.com` and callback domain `localhost`. Its existing
client credentials are saved in the ignored, owner-readable `.env.strava.local`.
No credentials were rotated. The provider currently allows one athlete. With the
owner's explicit authorization, a temporary Cloudflare tunnel now forwards to the
restricted local receiver, and Strava subscription `377465` is registered. The
local app is running with `STRAVA_SYNC=on`. The owner authorized the connection to
the signed-in local coach account, excluding Only You activities.

The live public HTTPS challenge succeeded through Cloudflare, Strava accepted the
subscription, unrelated application routes returned 404 through the tunnel, and
the authenticated local maintenance worker succeeded. Live OAuth authorization
and the first provider-to-database sync completed on 2026-10-17 at 21:34 UTC:
21 recent activities, scope `activity:read`, no pending job and no sync error.
The owner's subsequent request for more history expanded the lookback to 365
days. That earlier live snapshot contained 100 activities dated July 5 through
October 17, 2026. Requests use a `before` cursor to retrieve the newest page and
filter the one-year cutoff locally; an `after` cursor returned the oldest matching
page during live verification. The six-day retention remained. This historical verification predates the full-year pagination below.
This verifies initial activity retrieval; a subsequent real Strava activity-change
notification has not been independently observed yet. The original authorization
attempt expired during the approval wait and was successfully renewed.

Full-year backfill subsequently completed on October 17, 2026 (New York time):
312 activities covering October 18, 2025–October 17, 2026, in four activity-list
requests over two worker batches. Stored summary JSON totals 63,317 bytes,
excluding database/index/token overhead. The connection remains `activity:read`
with no pending backfill or error; Only You activities remain excluded.
Do not treat fixture-based tests as approval or a successful live-provider test.

### Local webhook receiver

`node scripts/strava-local-webhook.mjs` listens on `127.0.0.1:3011`. A tunnel must
target this port, **not the full application on 3010**. The relay accepts only
GET/POST on the exact secret webhook path, strips incoming cookies and authorization,
limits request size and concurrency, and never forwards upstream cookies. It also
calls the local maintenance worker every fifteen minutes while running.

A temporary Cloudflare tunnel requires explicit authorization to relay Strava
athlete/activity identifiers and event details through Cloudflare. This was approved
and started on 2026-10-17. The official `cloudflared` command is
`cloudflared tunnel --url http://127.0.0.1:3011 --no-autoupdate`. Save its HTTPS origin
privately as `STRAVA_WEBHOOK_ORIGIN`, then run the subscription setup above. Quick
tunnels are for development: their address changes after restart and stops working
when the process stops. The subscription tool deliberately refuses to overwrite a
different existing webhook. Use a stable endpoint before inviting other athletes.

The local receiver and maintenance job must remain running with the app. Production now uses its own durable HTTPS webhook, database scheduler, and environment configuration.
Next.js development request logs exclude the OAuth callback and webhook path so
authorization codes and verification secrets do not enter normal request logs.

## What users see

Connection and reconnect, optional private activities, last-sync status, manual
refresh (once per fifteen minutes), recent activity cards, links to the original
Strava activities, and disconnect/delete confirmation. Checking status reads the
local database only; it does not call Strava and does not poll automatically.
The full rolling 365 days are available without a 100-activity total cap. History
loads in pages of 100, with at most three pages per worker run. The UI shows 50
activities at a time with Show more; it loads only whitelisted summaries from the
local cache. Check status never calls Strava. Each fetched summary expires after
six days. Unvisited older summaries do not have their expiry extended.

## Cost and retention controls

- Reuse the existing Postgres database and small shared connection pool. No new
  queue, email, realtime, AI, or analytics provider is provisioned.
- Initial sync and the first refresh after five days traverse the year in resumable pages.
  Recent manual refreshes stop at the previous sync with a one-day overlap.
  Webhook create/update events coalesce by activity and fetch only that activity;
  deletion events remove it immediately without a provider request. No GPS streams, raw files, athlete profiles
  or permanent API activity archive. One upstream response is capped at 1 MiB;
  each normalized stored summary is capped at 2 KiB.
- Default **80 outbound calls per fifteen minutes and 800 per UTC day across the
  application**, including token calls. This deliberately leaves headroom below
  Strava's default quotas. Honor 429 backoff, including daily exhaustion. These
  app-side budgets do not grant additional Strava quota.
- A worker handles up to three history/recent pages, two changed activities and
  two revocations per run.
  A durable global lease prevents competing worker instances. Failed jobs stay
  queued with bounded backoff; the cron recovers work if an after-response task
  is interrupted. Jobs expire after six days. A full pass removes omitted old rows, while protecting
  changes fetched after the scan began. Failed pages retain their cursor and retry
  without fetching completed pages again. The cron continues incomplete backfills;
  cached progress is visible while they run.
- Older history is not repeatedly downloaded on activity webhooks. The production scheduler
  revalidates connected accounts after five days; manual refresh can also reload history. The
  cost model conservatively includes an initial backfill and six revalidations
  per billing month, plus incremental requests, cached-summary storage, browser
  and database traffic, and worker memory. Larger histories increase those costs.
- Cached copies expire at six days, are never returned after expiry, and are
  physically removed by the fifteen-minute cleanup. The margin before Strava's
  seven-day maximum depends on a healthy scheduler. Configure database backups,
  logs, replicas and restores consistently with the retention policy; app-level
  deletion alone does not erase a database backup. Expired copies must not be
  made visible by a restore.
- Deletion/privacy events remove activity summaries immediately. Short-lived
  tombstones protect against stale in-flight responses. A later create event can
  restore a newly visible activity. A deauthorization event removes the entire
  connection and cache. Local disconnect deletes the cache immediately and keeps
  only encrypted credentials in a revocation outbox for up to six days. If Strava
  remains unavailable, users can revoke access in Strava settings themselves.
- Tokens use AES-256-GCM with account and connection-generation authenticated
  context. Keep `STRAVA_TOKEN_KEY` stable and backed up securely. Key rotation
  requires an explicit decrypt/re-encrypt migration or reconnecting accounts.
- All tables have RLS enabled and browser-role privileges revoked. Account APIs
  use fresh verified authentication and return private/no-store headers. Own-account
  endpoints reject athlete selectors; the separate coach endpoint accepts only a
  validated coaching relationship and a bounded pagination cursor. The webhook uses a 256-bit unguessable path plus the
  configured subscription ID; Strava does not provide a signed event header.
  Treat that URL as a secret and redact it from request logs. Provider requests
  never follow redirects or use user-supplied destinations.

The cost estimator `scripts/training-cost-model.mjs` now accepts `stravaAthletes`,
webhook/read/sync volume, cached summary size, provider response size, extra worker
memory time, full-year page counts/revalidation, and `stravaDeveloperSubscriptionMonthly`. It conservatively includes 2,880 scheduled
worker calls in a 30-day month when Strava is in use. Production now runs those
2,880 small SQL maintenance ticks, but skips HTTP invocations when idle. Pricing remains an editable
planning assumption, not a bill forecast. More users require both Strava approval
and re-evaluation of budgets and worker capacity.

## Verification

Run `node --test tests/strava.test.mjs tests/training-cost-model.test.mjs` for OAuth → provider contract fixture → SQL
cache → own-account API → webhook → deletion/revocation coverage. The fixture
substitutes only external calls/auth; production contains no fake Strava data or
alternate provider endpoint. `scripts/verify-training-local.mjs` exercises the
real local Next.js HTTP/auth/database boundaries with live Strava disabled.
No browser testing is required.

## Sources checked 2026-10-17

- https://developers.strava.com/docs/authentication/
- https://developers.strava.com/docs/webhooks/
- https://developers.strava.com/docs/getting-started/
- https://developers.strava.com/docs/rate-limits/
- https://developers.strava.com/guidelines/
- https://www.strava.com/legal/api_policy
- https://vercel.com/docs/cron-jobs/manage-cron-jobs

The integration remains a limited beta; expansion beyond ten athletes requires
Strava capacity approval. Do not market separate Strava approval for Anystride.

## Explicit coach sharing

Migration 013 adds private, connection-bound consent and cache privacy metadata.
Athletes select a named active coach and confirm the past-year/future summary scope.
Coaches open **Strava activities** from their athlete roster. Every page checks the
active relationship, approved coach, consent, connection generation, and cache expiry.
Only You and unknown-privacy records never appear. Pending webhook updates are hidden
until privacy is revalidated. No raw GPS, streams, credentials or permanent copies are shared.

Stopping sharing is a quota-free write; controls remain readable after activity quotas
are exhausted. Revocation serializes with coach reads. Re-inviting/reaccepting or
reconnecting invalidates old consent; disconnect/deauthorization cascades its removal.
Existing rendered information cannot be recalled, but subsequent requests are denied.
The coach view discards its data when the tab is hidden and rechecks on return.

Coach reads make zero provider calls, return at most 50 summaries with a keyset cursor,
and use private/no-store responses. No polling, duplicate activity storage, or per-coach
Strava refresh is introduced. Model additional view and consent traffic with
`stravaCoachReadsPerCoach`, `stravaSharingReadsPerAthlete`,
`stravaSharingChangesPerAthlete`, and `stravaStoredGrantsPerAthlete` in the cost model.

This follows the requested explicit-consent workflow. Published precedent:
[Intervals coaching clarification](https://forum.intervals.icu/t/strava-visibility-update-coaching-is-ok/80331).
This implementation does not claim separate Strava approval for Anystride.

### Verification of coach sharing

All 238 automated checks passed across the full suite and the loopback relay rerun
(the sandbox initially blocked that test's temporary listening port). The real local
HTTP → Supabase Auth → PostgreSQL runner passed consent, 50-item pagination, private
filtering, unrelated-coach denial, stale consent rejection, reconnect invalidation,
and relationship revocation. Synthetic accounts and activities were removed.
TypeScript, ESLint and the production webpack build passed. No browser testing was used.
Historical local check; migration 013 is now also applied in production.

## Calendar display and workout matching

Migration 014 adds one-to-one links from cached activities to athlete-owned workouts.
The calendar fetches one bounded week (50 summaries per page) through a separate
private endpoint. All coach requests recheck explicit sharing, approval, relationship
and connection; private or pending-update activities are excluded. Matching is an
athlete-only action with workout-version checking. Undo uses a stable match id so
old retries cannot erase a newer match. The calendar places matched summaries on
the workout day and preserves the original activity date.

No plan, manual result, completion status, CSV export or saved template is overwritten
with provider data. Expiry hides links immediately; physical activity/workout deletion
cascades the link. Disconnect and reconnect delete the old cache and its links.
Viewing or matching adds zero provider calls. One small link row is stored per match,
not another copy of the activity. Shared data is cleared when the tab is hidden.

Calendar verification: 242 automated checks passed across the full suite and the
loopback relay rerun. Real local HTTP/Auth/Postgres checks covered coach calendar
visibility, match/retry/undo, unchanged saved results and revocation. No browser
testing was used. Migration 014 is now also applied in production.

The cost model adds `stravaCalendarReadsPerAthlete` (60/month by default),
`stravaMatchChangesPerAthlete`, and `stravaStoredMatchesPerAthlete`. Each coach
calendar page also counts toward `stravaCoachReadsPerCoach`. These estimates add
app requests, database transfers and small match rows, not provider calls.
