# Competing with V.O2 and Final Surge

Decision date: November 5, 2026 (America/New_York). Internal implementation and experiment plan, not a published price offer. User requested all proposed work and explicitly asked to keep workspace pricing unannounced while preparing recommendations. No new subscriptions, outreach, deployment or paid campaign is authorized by this document.

## Position and evidence

Initial segment to test: independent running coaches with 1–25 athletes. The proposed advantage is a clear first-week workflow and a path from useful free plans to relevant human coaching. Simplicity, faster onboarding and client acquisition are hypotheses, not proven claims. Calendars, marketplace profiles and training plans alone are not differentiators.

Verified vendor sources, November 5:
- https://vdoto2.com/vdot-coach — custom pacing, saved training and monthly tiers ($29.99/25 athletes, $39.99/100, $49.99/200).
- https://vdoto2.com/running-coaches — searchable coach marketplace and purchaser reviews.
- https://vdoto2.com/p/vdot-coach-200-yearly/117 — supported devices.
- https://www.finalsurge.com/pricing — monthly coach tiers ($19/5 athletes, $39/100).
- https://www.finalsurge.com/coaches and https://www.finalsurge.com/features — planning, communication, device connections and team tools.
- https://www.finalsurge.com/coaching-business — subscriptions, programs, intake forms and waivers.

Competitor pages are source-reviewed, not logged-in product tests. Check again before publishing a dated comparison if release is delayed. No competitor traffic estimate, backlink score or keyword volume has been established.

Search Console baseline: October 6–November 2, 2026; 5 Google clicks, 365 impressions, 1.37% CTR, average position 54.5. Pfitzinger 18/55: 3 clicks / 27 impressions. Query-level totals omit anonymized queries. These samples are too small to establish an acquisition trend. Do not attribute changes to this work until it is live and a complete observation window has elapsed.

## Local implementation

- Comparison hub /alternatives; /alternatives/final-surge; /alternatives/vdot-coach; /compare/vdot-vs-final-surge. Dated sources, fair strengths, explicit Anystride limitations, costs, direct workspace preview and signup path.
- Coach-first preview and practical onboarding on /for-coaches.
- /for-coaches/switching documents a manual, permission-based one-athlete trial. No unsupported vendor import promise.
- /coaching/focus/beginners, /coaching/focus/half-marathon, /coaching/focus/marathon use existing structured focus data, deduplicated public directory cards and category-specific buying questions. The /focus/ namespace avoids collisions with existing coach profile slugs.
- Categories with fewer than three visible cards are noindex and omitted from the live sitemap. Three is a minimum utility gate, not evidence of sufficient quality: manually review source freshness and category fit before release. Availability, communication frequency and prices are not invented from directory tags.
- Online directory includes online/hybrid coaches regardless of city bucket; explains region/time-zone checks.
- Public plan pages link to relevant coaching categories and the preview, while preserving free plan access.
- Storefront authoring asks coaches for starting requirements, communication, response expectations, availability and next steps using the existing fields. This does not backfill information or claim it has been verified.
- Approved-coach roster has a first-athlete guide using existing consent and assignment flows. No new private access or payment entitlement.

## Data to collect before expanding categories

Ask participating coaches to supply: the runners they serve, prerequisites, format and service area, current capacity, full price and duration, contact channel, check-in frequency, response expectation, cancellation terms and onboarding steps. Review with each coach; do not infer from an unclaimed listing. Current implementation stores this in existing profile/service fields. Structured filtering for these values is future work, requiring explicit fields and migrations.

Five-coach pilot protocol (not initiated; no messages sent): observe each coach applying, inviting one consenting athlete, assigning a week and reviewing a result. Measure task completion, points needing help and elapsed time after approval. Ask what would prevent replacing their current system. Do not claim Anystride is faster until a comparable task test supports it.

## Pricing recommendation — internal, not approved or implemented

Keep public workspace pricing unannounced. Test willingness to pay for $19/month up to 25 active athletes; consider $29/month up to 100 only after measuring heavy-roster support and usage. These are candidate prices, not a promise, subscription setup or validated profitable price. Prefer a time-limited trial over a permanent free unlimited coach tier. Keep free public plans and runner access separate from coach billing decisions.

Separate two commercial questions: paying for coaching software, and paying for acquiring/servicing marketplace business. A future proposal could charge workspace fees for bring-your-own athletes and a marketplace commission for sales sourced through Anystride. Do not change the existing 10% storefront policy without a separate business decision and implementation. Do not stack fees opaquely or promise zero payment-processing cost.

Illustrative revenue only: 10 coaches at $19 = $190/month; 50 = $950/month; 100 = $1,900/month. On $2,000 of storefront sales, the current 10% commission is $200 before costs/refunds/disputes. This does not establish net margin or comparable total costs against competitors.

Before setting prices, calibrate scripts/training-cost-model.mjs against actual invoices and bounded usage: fixed hosting/database/auth commitments, storage, database egress, browser/CDN transfer, function invocations/CPU/memory, auth MAU, provider limits, payment fees and support time. Its historical rates are assumptions, not current vendor quotes. Model typical and heavy coaches; include support and retained inactive data. No infrastructure tier or subscription has been changed.

## Measurement and review

Public, privacy-filtered events:
- coaching_preview_interact: role (runner/coach) and action (switch-role/screen/workout/athlete-calendar). Counts deliberate use, not impressions or signups.
- coaching_preview_signup: intent to enter signup, not successful registration.
- coaching_category_open: one of the three supported category slugs.
- coach_application_open also recognizes coach signup links.

Existing public GA/PostHog guards remain: production domain only, opt-out respected, no private account scripts. Private athlete identifiers, notes, dates, results and emails must never enter these events. No new cross-account or identity stitching.

scripts/coaching-activation-report.mjs reads aggregate counts from an explicitly selected database, with a read-only transaction and query timeout. It reports application counts, current approvals/connections and retained assignments within a CLOSED 14-day application cohort. A non-local DB requires --allow-production-read. It loads no environment files and prints no identifiers. Example (with the selected connection supplied securely): node scripts/coaching-activation-report.mjs 2026-10-01 2026-11-01.

Limitations: deleted assignments are absent; application is not approval time; current connection/approval states are not historical states. This report cannot attribute activated coaches to SEO or claim first-ever task times. There is no completion event merely because signup was clicked. No production report was run during implementation.

After release, record the live date. At 14 days check indexing, errors, preview usage and applications; keep immature cohorts pending. At 28 days compare equal mature Search Console windows by page family and review retained coach activity. At this traffic level, report counts and interview findings rather than significance claims. Expand only categories with real inventory and useful enquiries. Do not create another scheduler.

## Product work requiring a separate implementation/release phase

1. Workout feedback threads and notification preferences: design private access, retention, consent and reliable delivery before implementation. Existing notes are not threaded messaging.
2. Provider-supported migration: obtain permissioned sample exports and field definitions; build a dry-run mapper and duplicate handling before calling it a supported import. No scraping of private competitor accounts.
3. Device delivery and wider sync: partner/provider approval, scopes, rate budgets and compliance review are prerequisites; current Strava beta capacity remains unchanged.
4. Structured availability, service cadence and verified purchaser reviews: require data model changes, owner confirmation and moderation; existing prose prompts are groundwork.
5. Recurring billing, intake and waivers: not implied by current one-payment storefronts. New billing and legal workflows need their own requirements and review.

These items are unresolved product capabilities, not features shipped by this SEO implementation. The pages disclose the gaps rather than claiming parity. No live pricing, competitor-account access, provider expansion, marketing outreach or production write was performed.
