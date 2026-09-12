# Anystride — 90-day implementation sequence

Status recorded 2026-09-12. Weeks describe the original sequence, not elapsed time.
This file is the working checklist; an implemented item is not necessarily deployed.

## Weeks 1–2: trustworthy foundations

- [x] Race timestamps/time zones, separate schedule/field/results coverage, official sources and stale-data labels.
- [x] Design/contrast and mobile navigation pass (local changes).
  - Design direction: restore “Training plans for any distance, any runner.” and the earlier minimal layout. Keep functional and accessibility improvements; avoid decorative hero cards, oversized section slogans and floating navigation.
- [x] Core product action events and event/user counts in the weekly GA report (local changes).
- [x] Sitemap content revision dates where known; unknown dates remain omitted (local changes).
- [x] Explicit changed-page IndexNow endpoint; remove daily whole-site submissions (local changes).
- [ ] Connect changed-page submission to the production publishing workflow after deployment.
- [ ] Establish a production baseline: Search Console queries/CTR, traffic and event counts.
- [ ] Review consent and analytics configuration before expanding tracking to new markets.

## Weeks 3–6: help runners start and return

- [x] Three-question plan finder with explanations and alternatives.
- [x] No-account plan activation, dates, units, local progress, resume, print and calendar export.
- [x] Consolidate the two long-run fueling guides with a permanent redirect, references and corrected advice (local changes).
- [x] Organisation byline, editorial standards and correction contact (local changes).
- [ ] Source-review the remaining guides; recruit real, named qualified reviewers where needed.
- [ ] Measure activation and return usage; adjust recommendations using observed friction.

## Weeks 7–10: Racing pilot (next feature block)

- [ ] Create a source registry with official domains/feeds, allowed content use, update cadence and owner.
- [ ] Discovery job: fetch approved feeds/API sources, deduplicate URLs/content hashes, retain provenance.
- [ ] Store drafts with fetched time, source URL, attributed claims and race/athlete references.
- [ ] Build an authenticated human review queue; approve/reject/correct before publishing. No raw scraped HTML rendering.
- [ ] Racing hub: Latest / Calendar & results / Athletes; durable event pages and linked athlete profiles.
- [ ] Cover around 20 major events and 20–30 source-checked athletes. Existing profiles are not automatically “verified”.
- [ ] Test feed failures, duplicates, stale sources, corrections, untrusted content and publish permissions.

Publication gate: do not auto-publish unverified articles, copy full stories, or use unlicensed photos. Source text is untrusted data, never instructions. New sources require review.

## Weeks 11–12: distribution and repeat visits

- [ ] Weekly race primer with results follow-up and links to original reporting.
- [ ] RSS for published original coverage; race/athlete share cards.
- [ ] Follow alerts and newsletter with explicit opt-in and unsubscribe.
- [ ] Automate only verified, structured results; retain correction/rollback paths.

## Measurement contract

The GA weekly endpoint now returns `productEvents` with `eventCount` and `totalUsers`, including zero-count rows. A seven-day report covers seven complete days ending yesterday in the GA property’s time zone. These are observed event/user counts, **not** a deduplicated multi-step conversion funnel or a retention cohort.

| Event | Meaning |
| --- | --- |
| `plan_finder_complete` | Valid finder submission; excludes answers |
| `plan_activated` | Valid start date submitted to activate a plan |
| `plan_resume` | “Go to week” clicked; not evidence of a separate return visit |
| `workout_complete` | A previously unchecked workout was checked; rechecking can count again |
| `plan_calendar_download` | Calendar download requested; not proof of import |
| `plan_print` | Print dialog requested; not proof of printing |
| `race_source_click` | Official event, verification or results link clicked |
| `guide_plan_click` | A related plan opened from a guide |

Product events run only in production on `anystride.com` / `www.anystride.com`, respect DNT/GPC, and use a restricted parameter allowlist. No user-entered fitness values, dates, notes or contact details are added. Existing pageview/third-party analytics are unchanged. Production delivery still needs validation after deployment; local tests must not send real events.

## Changed-page indexing workflow

After publishing and verifying pages, send an authenticated `POST /api/indexnow` with JSON such as:

```json
{"paths":["/guides/fueling-for-long-runs","/guides","/editorial"]}
```

Use `Authorization: Bearer <INDEXNOW_SECRET>` from the deployment secret store; the existing `CRON_SECRET` is accepted as a fallback. Never put a secret in a query string. Missing configuration fails closed. Batches accept 1–100 current canonical paths, deduplicate, and reject queries, fragments, old redirect paths and off-site URLs. The former daily GET cron is removed.

Submit only actual changes **after** they are public. A successful response acknowledges provider acceptance, not guaranteed crawling/indexing. On failure, retry the same explicit batch later with backoff. This endpoint currently covers live added/updated pages; a reviewed deletion/tombstone workflow is still needed. No production submission was made during implementation.

Only advance recorded revision dates after content changes. Do not replace them with build time or update every page on each deployment.

References: [IndexNow documentation](https://www.indexnow.org/documentation), [IndexNow FAQ](https://www.indexnow.org/faq).

## Local verification

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Browser smoke checks: finder → plan → start → workout → reload/resume; source links; consolidated guide and redirect; editorial page at mobile and desktop sizes. Do not call the live IndexNow endpoint as a test.

2026-09-12 verification: seven regression tests, lint, TypeScript and the production build passed. Desktop browser checks confirmed the duplicate-guide redirect, source/byline rendering, editorial layout, finder result, activation, calendar link and saved workout after reload. Activation now reads the submitted date control as well as storing it, avoiding a mismatch between native/autofilled input and React state. Mobile checks for the new editorial page and production analytics delivery remain to be done.
