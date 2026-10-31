# Training workspace: parity and cost plan

Updated 2026-10-17. This is an implementation and operating plan, not a public pricing offer. “VO2” is interpreted as V.O2 / VDOT Coach. Feature parity is the direction; it has not been achieved by this release.

## Implemented in this change

`/account/training` provides a private, database-backed weekly calendar. Athletes can create, edit, reschedule by date, duplicate and delete sessions; record completion or a skipped session; log actual duration, distance, perceived effort and notes; create reusable library workouts; and export the selected week as CSV. Run, bike, swim, strength and other sessions are supported. Distances are in kilometres. Weekly totals distinguish planned values from recorded results and combine sports; missing actual values are not inferred.

The workout library supports whole-session targets, notes and structured steps. Approved coaches also have a reusable multiweek plan library. The existing no-login plans, local progress and calendar downloads remain free and separate; this change does not automatically import their progress. An approved coach can access an athlete’s calendar only through an invitation that athlete accepted. Administrators have no training-access bypass.

The feature reuses existing Supabase authentication and the explicitly selected marketplace PostgreSQL connection. No new provider, paid subscription, payment flow or production resource has been provisioned. The Marketplace discovery command failed to reach the network; there was no need to replace existing services. Production activation and billing settings were not changed.

## Coach and athlete workflow

`/account/athletes` now provides in-account invitations, accept/decline, a searchable coach roster, weekly completed/planned/skipped counts and recorded minutes, athlete calendar access, and individual or group workout assignment. Coaches can start from their own library or create a workout, then assign separate copies to up to 20 athletes. Invitations are visible when the athlete signs in with the exact verified email; **no invitation email is sent**. A coach can invite a new account before it exists. The current pilot email allowlist still applies to account access.

Accepting explicitly shares the entire calendar, including past workouts, results, notes and imported summaries. It never shares the athlete’s private workout library. The coach can edit/delete only their own planned assignments; the athlete controls actual results, completed sessions and personal workouts. Either participant can end access immediately, retaining existing workouts. A suspended coach loses calendar access. Invitations expire after 14 days; reinviting an expired, declined or revoked connection requires fresh acceptance. Changed invitations and workouts have version conflicts. Access, quotas and batch writes are checked inside the same transaction; a failed group assignment saves no partial batch.

Strava support is **file import, not OAuth or automatic synchronization**. An athlete selects `activities.csv` from a [Strava bulk export](https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export), selects the export’s distance units, reviews summaries and imports up to 20 at once. The parser runs on the device, accepts English/ISO dates and English column names, preserves written dates, and reports unsupported rows. Durations use elapsed time, including stops. Missing distances stay unrecorded rather than becoming zero. It deliberately uses the first Distance column (display units), not Strava’s later duplicate raw-metres column. Files are limited to 5 MB / 5,000 rows. No routes, original files or credentials are uploaded.

Matching is explicit: a same-day/same-sport planned workout in the open week can receive the activity’s actual duration/distance while retaining its plan, instructions and coach assignment. Import IDs are unique per account; retries and re-uploaded exports skip existing IDs without overwriting corrections. Deleting an imported workout allows reimporting that ID. Import changes never propagate back to Strava. Connected coaches see these athlete-provided summaries under the accepted calendar grant. Direct Strava API integration remains separate work requiring an approved app, current permissions and [current data-display restrictions](https://support.strava.com/en-us/articles/15401608-api-agreement-update-how-data-appears-on-3rd-party-apps); API-sourced data must not silently enter the shared-coach path.

## Structured workouts and multiweek plans

Structured instructions are available in the calendar, workout library, group-workout assignment and plan editor. A workout has up to 12 blocks and 24 steps before repeats; each block repeats 1–30 times, capped at 200 expanded steps. Steps support warm-up, work, recovery and cool-down; minutes, kilometres or open duration; and optional effort (1–10), pace (seconds/km, edited as min:sec), heart-rate or power ranges. These are coach-entered instructions, not inferred physiological zones. Repeats remain compact in storage. Entirely timed or distance-based structures derive their corresponding total; mixed/open structures retain an optional overall estimate, which cannot be smaller than the known segments. Actual results are never inferred. Existing unstructured workouts remain editable, and matching a Strava import preserves structured instructions. Selected-week CSV includes readable steps and plan attribution.

`/account/plans` provides a coach-only plan library. Coaches create, edit, duplicate and delete templates; choose 1–24 weeks; add up to 168 sessions on relative week/day positions; copy workouts from their private library; duplicate a week; and move/edit/remove individual sessions. Empty days mean no scheduled workout. The plan description is private library context; athlete calendars receive each session’s instructions and the plan title. Save conflicts preserve the local draft for recovery. Saving or deleting a template does not mutate already assigned workouts.

Assignment is a two-step in-app flow: select accepted athletes and a Day 1 date, then review every mapped date and capacity before saving. Day 1 may be any weekday. The server checks the plan version, every active grant, lifetime storage, daily capacity, monthly write allowance and retained assignment capacity again at save time. A request contains references and a start date, not duplicate copies of the entire plan. It admits at most 20 athletes and **500 workout copies**; longer plans reduce the number of athletes offered per batch. Two bulk inserts save assignment receipts and workouts in one transaction, with no per-workout network round trip. A failure rolls back all athletes and the usage charge. Repeat blocks are not expanded into database rows.

Durable assignment receipts make the same request repeat-safe even after the template changes or disappears and after an athlete deletes or completes sessions. A separate uniqueness rule prevents the same plan being accidentally assigned twice to an athlete on the same start date with a fresh request key. To intentionally start afresh on that date, duplicate the template first; the review states that existing sessions remain. Assignment history is paginated 20 rows at a time. Coaches with current access can remove an assignment’s remaining planned sessions; completed/skipped sessions, unrelated workouts and other athletes’ copies remain. Removal retains the receipt and cannot be used to silently re-create a plan on retry. Ending coach access prevents plan assignment and removal as well as individual calendar changes.

Limits: 50 saved templates per coach; a normalized plan up to 256 KiB; calendar/coach request bodies stay at 8 KiB, while plan save bodies allow 256 KiB plus 8 KiB envelope headroom. Individual normalized workout details are capped at 6 KiB to leave room under the existing 8 KiB jsonb limit. Up to 2,000 athlete-plan receipts per coach are retained for duplicate protection. Each copied/removed workout consumes one coach write, and a replay reads the existing receipt instead of reapplying the plan. Plan previews, library opens and history views consume the existing read allowance. No new provider, queue, subscription, scheduled job or background polling is required.

## Verified comparison baseline

Checked against the vendors' own pages, not old comparison articles. Prices are USD and can change; coaching services and training plans are separate purchases.

| Product | Published price anchors | Relevant capabilities |
| --- | --- | --- |
| [V.O2 Coach](https://vdoto2.com/vdot-coach) | $29.99/month for 25 athletes; $39.99 for 100; $49.99 for 200. Annual: $299.99 / $399.99 / $499.99. | Custom pacing, groups, workout/template libraries, weekly mileage, GPS and comments, marketplace and payments. |
| [Final Surge](https://www.finalsurge.com/pricing) | Core athlete tier free; coaches $19/month for 5 athletes or $39/month for 100. | Calendar, connected devices, stats, mobile apps and coaching. |
| [Final Surge Premium](https://www.finalsurge.com/premium) | Advertises $6.58/month billed annually. | Adds readiness, photos, weather, routes and athlete pages. Older pages saying all advanced features are free omit this newer tier. |
| [TrainingPeaks Athlete](https://www.trainingpeaks.com/athlete-pricing/) | Premium $19.95/month or $134.99/year; Basic free. | Planning and performance features; personal coaching/plans separate. |
| [TrainingPeaks Coach](https://www.trainingpeaks.com/pricing/for-coaches/) | $21.99/month base (4 Basic athletes and 1 Premium); $54.99 base for 5+ Basic. Additional Premium starts at $9/athlete with volume discounts. | Structured sessions, device sync, performance charts, zones, recurring workouts and communication. |

“Cheaper than Final Surge” cannot describe a paid replacement for its free athlete tier. The useful proposition is a free core plus lower coaching overhead, with explicit allowances for costly advanced features. Do not advertise parity until the workflows below are actually available.

## Remaining parity work, in implementation order

| Area | Current state | Next acceptance milestone |
| --- | --- | --- |
| Plans and pacing | Curated plans, finder, pace calculator and local progress already exist | Import an eligible plan into an account calendar with repeat-safe activation and clear date mapping; keep calculator pace assumptions visible. |
| Calendar and log | Saved log, with explicit coach access | Recurring sessions, calendar bulk move/copy, race goals, availability, miles preference and full-history paginated export. |
| Coaching collaboration | Invitations, consent/revocation, roster, progress, individual/group workouts and complete-plan assignments implemented | Scoped comments, reminders and more coach planning tools; existing sandbox messages are separate. |
| Workout design | Structured steps, repeat blocks, effort/pace/heart-rate/power targets and reusable multiweek templates | Athlete zone profiles, automatic zone-based targets and compatible FIT/TCX/device export. |
| Devices and migration | Strava activities.csv preview, import, matching and deduplication implemented | User-authorized FIT/TCX/GPX imports with size/sample limits, deduplication, then approved Garmin/COROS/Strava integrations and deletion/disconnect. Provider access is not guaranteed. |
| Analysis | Weekly manual totals | Daily precomputed summaries, sport-specific trends, intensity distribution and explainable load measures; no proprietary-score equivalence claims. |
| Recovery and notifications | Not implemented | Opt-in wellness logs and bounded digest notifications; aggregate before sending; no default SMS. |
| Teams and commerce | Storefront/services/payment work exists separately | Team roles, production-safe conversations, recurring billing and entitlement reconciliation. |
| Mobile / offline | Responsive web application | Offline queue with conflict handling, installable app, push opt-in; native apps only if required by device capabilities. |
| Premium extras | Not implemented | Routes/maps, photos, weather and indoor training need separate usage and licensing budgets. Virtual riding is a separate large product, not a checkbox. |

## Cost controls actually enforced

- At most 31 days per calendar read, indexed by `(user_id, kind, scheduled_date, id)`. The UI requests seven days. At most 20 sessions per day, 20,000 stored workouts and 100 library workouts per user.
- Calendar/coach JSON writes are streamed with an 8 KiB limit (plan saves have the bounded larger envelope described above); normalized import batches have a 64 KiB limit and at most 20 activities. Raw files never reach the server. Titles are 120 characters, notes 1,000 characters; metric/date/sport fields are validated. Database documents have an 8 KiB ceiling too.
- A single durable aggregate row per user tracks 10,000 admitted reads and 2,000 admitted writes/deletes (20,000 for approved coaches) per UTC calendar month, plus 60 admitted requests per minute. Cross-instance advisory locks serialize limit checks and writes; month/minute rollovers are atomic. Each assignment/import copy counts as a write, not merely one write per batch. Duplicate-only import retries count as one request/write. Rejected operations roll back counters. Ending a relationship bypasses the save allowance. This is not a billing ledger and does not retain historical months.
- Rosters are bounded at 100 active/pending connections and 500 retained relationships per coach, with up to five active coaches per athlete. Progress uses one indexed SQL query, not one network call per athlete. Relationships and calendars use a consistent account-lock order; current grants are rechecked under lock.
- No polling, autosave, realtime fan-out, per-workout AI, maps, image uploads or email are introduced. A successful mutation returns the single saved row; weekly totals and selected-week CSV are calculated in the browser. Initial calendar data comes from the server render without a duplicate browser fetch.
- Private queries use the authenticated account or an active athlete grant verified for that coach. Browser database roles have no grants or RLS policies. Auth identity is freshly verified, mutations require the configured origin, and API responses are private/no-store. There is no admin bypass.
- Existing shared pool, connection limit and statement timeouts are reused. The account shell fetches the coach summary rather than the entire catalogue and enquiry history. Public static plan content stays independent of private calendar reads.

These bound application work; they are **not** a global spend cap. Auth verification and requests rejected before the meter still consume infrastructure, and many users can exhaust shared capacity. Configure provider budget alerts and edge rate limits before a public rollout. Never rely on in-memory rate counters across serverless instances. Keep private responses out of shared CDN caches.

## Reproducible unit economics

Run `node scripts/training-cost-model.mjs` for example scenarios, or pass a JSON file of numeric overrides, e.g. `node scripts/training-cost-model.mjs /path/to/assumptions.json`. This reads no secrets and calls no provider. The full output includes assumptions, traffic volumes and separate provider subtotals. Unknown fields, negative/non-finite values and impossible population counts are rejected. Populations are all active athletes, including free users; retained history is modelled separately from monthly activity.

The default is an **illustrative configuration**, not an inspection of Anystride's current paid accounts: one Vercel Pro seat with Flat Rate CDN enabled and one Supabase Pro project supplying both database and auth. If the selected marketplace database is elsewhere, replace its rates/base/egress/storage and include the separate auth bill. Do not silently count an allowance twice across projects or services.

Rate sources checked 2026-10-17:

- [Vercel pricing](https://vercel.com/pricing): $20 base and $20 usage credit; published starting rates of $0.60/million invocations, $0.128/CPU-hour, $0.0106/GB-hour memory and $0.06/GB origin transfer. Regional and account differences must be reflected in overrides.
- [Vercel Flat Rate CDN announcement](https://vercel.com/changelog/flat-rate-cdn-is-now-ga-for-pro-teams): included 1 million requests/1 TB; $20 additional tier for 10 million/50 TB; $100 for 50 million/50 TB; $300 for 150 million/50 TB. Existing teams must enable it. These are team allowances, not per-project allowances. The model chooses capacity for sustained use; it does not treat spike protection as unlimited permanent traffic. Beyond the published tiers it returns no total rather than a false zero.
- [Supabase pricing](https://supabase.com/pricing): illustrative $25 base, 8 GB database ($0.125/GB above), 250 GB uncached egress ($0.09/GB above), 100,000 MAU ($0.00325/MAU above). Compute upgrades, extra projects and additional services must be added explicitly.

Default **unmeasured workload**: 20 account page loads, 60 total calendar reads including those loads, 40 saves and 10 public page views per active athlete/month; eight CDN requests and 250 KB per page; 24 KB calendar responses; 2 KB mutation responses; 28 KB database payload per read plus 2 KB auth payload per dynamic request; 520 retained workouts at 2 KiB each; 25 ms CPU and 0.3 GB-seconds memory per dynamic request. Decimal GB are used. These sizes include estimates for protocol/row/index overhead but are not benchmarks. The model distinguishes browser transfer, origin transfer and database/auth egress; CDN discounts do not eliminate the latter two.

| Active/stored athletes | CDN requests/month | Browser transfer | Database/auth egress | Stored training data | Illustrative infrastructure subtotal/month |
| --- | --- | --- | --- | --- | --- |
| 1,000 | 320,000 | 8.5 GB | 2.0 GB | 1.1 GB | $45.00 |
| 10,000 | 3.2 million | 85.4 GB | 19.6 GB | 10.6 GB | $65.33 |
| 100,000 | 32 million | 854 GB | 196 GB | 106.5 GB | $197.27 |

These are **partial arithmetic scenarios, not expected bills or demonstrated capacity**. In particular the model does not claim a Micro database can serve 100,000 athletes. Database compute upgrades, session-refresh/proxy work, auth overhead beyond payload estimates, backups, logs, builds, analytics, support, payment fees, notifications, taxes, device services, and other projects sharing allowances are not benchmarked. Enter measured extras using `databaseComputeExtra` and `otherMonthlyCosts`, and adjust request/CPU/memory inputs after profiling. Stored users can outnumber active users. A 10x payload/request stress case and peak concurrency load test must precede scale claims.

The model also accepts `activeCoaches`, `rosterReadsPerCoach`, `rosterResponseKB`, `coachCalendarReadsPerCoach`, `assignmentCopiesPerCoach`, `athletesPerAssignmentRequest`, `importsPerAthlete`, `activitiesPerImportRequest` and `cpuMsPerAssignmentCopy`. Default coach/import counts are zero so the original athlete-only scenarios above remain comparable. For example, add 10 coaches and 40 imports per athlete: `{ "activeCoaches": 10, "importsPerAthlete": 40 }`. With the default 10-copy assignment and 20-activity import batches this adds 4,600 dynamic requests, 4,000 assignment copies and 40,000 imported rows. Batching reduces requests, not row work or retained storage. Update `storedWorkoutsPerAthlete` to include assigned/imported history; adjust page-load assumptions for coach dashboard visits. The model conservatively counts coaches as additional auth users even if some are already counted as active athletes. It does not estimate invitation emails because none are sent, or Strava API costs because no API is called.

For plans, configure `planReadsPerCoach`, `planSavesPerCoach`, `planSummaryReadsPerCoach`, `planPreviewsPerCoach`, `planAssignmentsPerCoach`, `workoutsPerPlanAssignment`, `planResponseKB`, `planSummaryKB` and `planPreviewDatabaseKB`. Defaults leave plan activity at zero; model it explicitly for a coaching launch. Template bodies are fetched only when opened, while library/history views return summaries and assignments return compact confirmations. The model distinguishes `planRequests` from `planCopies`, counts per-copy CPU work, reports `databaseWriteGB` sent to the database separately from database response egress, and includes retained templates/receipts via `storedCoaches`, `storedPlansPerCoach`, `storedAssignmentsPerCoach` and the corresponding byte-size inputs. Those byte figures are assumptions, not row-size measurements. Database write traffic is reported for budgeting; any provider-specific outbound charge not already represented must be entered in measured extra costs. Increase stored workout bytes for structured sessions and count their retained calendar copies in `storedWorkoutsPerAthlete`; batching does not remove storage cost. No new provider rates have been introduced by this increment.

## Pricing experiment, not enabled billing

Keep core athlete planning/logging free. Test coaching software at $9/month for up to 5 active athletes and $29/month for up to 100, after measuring the implemented coaching workflows at the intended roster size. For over 100, start with quoted volume pricing rather than promising unlimited storage or imports. These hypotheses undercut the cited monthly coaching tiers at comparable roster sizes; the present product does not yet provide comparable functionality.

Price expensive additions separately with clear included allowances: raw activity retention/import bytes, image storage/downloads, notifications and AI tokens. Prefer summaries with bounded raw-file retention; avoid charging for every ordinary calendar click. Never silently charge overages. Existing marketplace commissions are a different revenue stream and are not changed here.

Use `revenue - infrastructure - payment fees - support - device/licensing costs` to assess contribution, counting **all free athletes** in infrastructure. A 70% contribution target leaves $8.70 total direct costs on a $29 coach plan; assess that at a full 100-athlete roster, not just a typical small roster. Allocate fixed costs across paying coaches and test low conversion as well as high adoption. If measured support/import costs exceed the budget, change allowances or the price before selling; lower cost cannot be guaranteed by the hosting subtotal alone.

## Local operation and rollout

1. Apply `db/migrations/008_training_workspace.sql`, `db/migrations/009_training_coaching.sql` and `db/migrations/010_structured_training_plans.sql` in order (requires the existing `002_marketplace.sql` coach schema) to the database explicitly selected by `MARKETPLACE_DATABASE_SOURCE`. It is additive and repeatable; no existing rows are migrated. Use the established server role with access to these private tables. Do not apply it to the separate payments database.
2. Set `TRAINING_WORKSPACE=on` in the intended environment only after migration. It defaults off in `.env.example`; both page/API access are gated and navigation is hidden when disabled. Existing pilot invitations still apply.
3. The guarded local runner now includes all three training migrations and enables training: `node scripts/local-marketplace.mjs setup`, then `node scripts/local-marketplace.mjs dev` (port 3010). It only accepts the existing isolated local Supabase endpoints.
4. Automated checks: `npm test`, `npm run lint`, `npx tsc --noEmit`. For a real local HTTP/Auth/PostgreSQL check, start the guarded dev runner with `LOCAL_MARKETPLACE_TEST_EMAILS=training-coach@local.invalid,training-athlete@local.invalid,training-other@local.invalid`, then run `node scripts/verify-training-local.mjs`. It creates dedicated local identities, exercises invitation → acceptance → assignment → Strava match/retry → progress, structured plan save/preview/group assignment/retry/removal, revocation and server-rendered pages, then removes its synthetic records. No browser is used. Keep any additional local test emails when restarting the runner. Check deployment authentication, database privileges and schema before production activation.
5. Set budget alerts at 50/80/100% of an explicit monthly cap, verify the team's actual CDN billing mode, locate compute near the database, and monitor query latency/connections. Add rate limiting at the edge for account/auth/API paths and agree what to disable at the cap. None of these provider settings have been changed by this implementation.
6. Before broad launch: account deletion must remove training entries/usage, private plans and assignment receipts, and revoke/remove relationship records for that user; implement that workflow with existing account removal. Add paginated full-history export, historical aggregate usage reporting, and retention policy. Current CSV exports the selected week only; users can delete individual workouts themselves. No training contents are sent to product analytics.

Rollback: turn the flag off. Keep tables and saved history; re-enabling restores access. Do not drop data to roll back the UI.

The installed Vercel CLI reports 62.4.0. Upgrade to the available 64.5.0 or later with `npm i -g vercel@latest` before provider configuration; it was not globally changed during feature work.

## Earlier calendar verification (2026-10-17)

- Full automated suite: 187 passed (including 11 new training/cost tests). Focused training/cost tests passed again after final test refinements. SQL tests execute the real migration and store against isolated PGlite PostgreSQL, including owner isolation, no admin bypass, replay/conflict handling, deletion, library copies, UTC quota rollover, daily/lifetime caps and browser-role privilege denial.
- Lint, TypeScript and diff whitespace checks passed. Production build passed with `npm run build -- --webpack`. Default Turbopack build was blocked by font networking and then the environment's worker-port restriction; no application compile error was identified in those failed attempts.
- Real local Supabase Auth and PostgreSQL browser check: existing test-account session, empty calendar, create, reload/persistence, actual results, totals, save library template, schedule a clean copy on another day, and selected-week CSV download. Browser console had no errors. Narrow viewport: 390 px content within a 390 px viewport, with readable totals and controls. Deletion, conflict and account-isolation verification was automated rather than exercised through two browser sessions.
- Synthetic browser data stays only in the guarded local test database. No production deployment, migration, billing change, commit or push was made.

## Coaching/import verification (2026-10-17)

- Full automated suite: 197 passed; all 13 focused coaching/import/cost tests passed again after the missing-distance refinement. Lint, TypeScript, whitespace checks and the final production webpack build passed. The local HTTP integration script passed and cleaned up its synthetic records.

- Automated SQL/HTTP tests cover consent, wrong recipient, expired/reissued invitations, suspension, private libraries, no admin bypass, coach edit restrictions, revocation, atomic/repeated group saves, per-copy quotas, roster/coach caps, source deduplication, owner-scoped matching, rollback on stale matches, CSV parsing and provider-traffic calculations.
- Real local HTTP verification uses local Supabase Auth and PostgreSQL, including page rendering. It leaves existing user records intact and cleans up its own test identities and workouts. This increment does not use browser automation.
- The local additive schema is applied. Production migrations, deployment, pricing and billing are unchanged. Full parity remains open; structured intervals and multiweek plans were added in the following increment.

## Structured plan verification (2026-10-17)

- Full automated suite: **210 passed**. Lint, TypeScript, whitespace checks and the production webpack build passed. New checks cover typed targets, repeat/byte limits, derived versus partial totals, structured Strava matching, private plan versions, group assignment, immutable copies, receipt replay/deduplication, transaction rollback after an injected database failure, quotas, stale/revoked grants, history pagination, database-role denial, safe removal and leap/year boundaries. The cost tests distinguish compact assignment responses from per-copy processing/storage.
- Real local HTTP → Supabase Auth → PostgreSQL verification passed for structured plan creation, preview, two-athlete assignment, retries, athlete results, template edits/deletion, removal that preserves results, and server-rendered plan/calendar pages. No browser testing was used. Synthetic records were removed afterward.
- A separate local sample assigned **336 structured workouts** (24 weeks × 7 sessions × 2 athletes) in **163 ms** and returned a **71-byte** confirmation. This is one local observation, not a production capacity/latency guarantee. Larger load/concurrency profiling and actual provider bills are still needed before scale or pricing claims.
- Migration 010 is applied locally. Production schema, deployment, billing and paid entitlements are unchanged. The local app remains available on port 3010.

## Strava connection beta — 2026-10-17

Implemented an optional athlete-only OAuth connection, private recent-activity
view, durable webhook-triggered sync, encrypted token rotation, rate-limit
backoff, expiry cleanup and disconnect/revocation. API activities never enter
coach calendars or permanent training records. The initial beta is capped at ten
connections, a rolling year of activity summaries, 80 provider calls per fifteen
minutes and 800 per day. The cost model includes Strava reads, webhook/sync
traffic, scheduled workers, temporary storage and an explicit developer
subscription assumption. See [Strava setup](strava-setup.md) for configuration,
retention requirements and the limits of provider verification.

The local schema is applied through migration 012. Live local activation and a
312-activity full-year backfill are verified. Pages of 100 resume across worker
runs; recent refreshes reuse history, and webhook edits fetch one activity.
Full history revalidates on refresh after five days; cached copies expire at six.
The cost model includes history pagination and revalidation, and the UI reveals
50 cached summaries at a time. No production deployment has been performed. Automated tests use
provider contract fixtures, while local HTTP checks use real local auth and SQL.

## Explicit Strava coach sharing — 2026-10-17

Supersedes the own-athlete-only restriction described in the original beta notes.
Connections now has separate, opt-in permissions for named coaches. Coaches use the
roster's Strava activities view. The underlying cache remains temporary and separate
from calendars, exports, and AI. See [setup and permission behavior](strava-setup.md#explicit-coach-sharing).
The cost model counts coach pages, permission controls/changes and retained consent
rows separately; coach reads add no Strava API calls or duplicated activity storage.

Calendar overlay and athlete matching now extend the sharing workflow. Structured
plans and saved/manual results remain separate from temporary provider data. The
homepage now describes this early-access scope, with no full-parity or lower-price
guarantee. Production activation remains a separate step.
