# Weekly analytics review agent

A scheduled agent that, **every week**, pulls Google Analytics stats for
anystride.com, finds what's under-performing, and proposes concrete page changes.

## How the pieces fit

```
GA4 (collection)  ──gtag on the site──►  Google Analytics
        ▲                                      │
        │ NEXT_PUBLIC_GA_ID                     │ GA4 Data API (read)
        │                                       ▼
   src/app/layout.tsx                  scripts/ga-weekly.mjs
                                               │ JSON: top pages, engagement, landing
                                               ▼
                              Weekly Claude agent (cron via /schedule)
                                               │
                                               ▼
                          GitHub issue with prioritized suggestions
                                  (optionally: a draft PR)
```

## One-time setup (what you provide)

### 1. Collection — start the data flowing
1. Create a **GA4 property** for anystride.com → Admin → Data Streams → Web.
2. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
3. In Vercel → Project → Settings → Environment Variables, add
   `NEXT_PUBLIC_GA_ID = G-XXXXXXXXXX`, then redeploy.
   (The site already conditionally loads GA when this is set — see
   `src/app/layout.tsx`.)

Let data collect for at least a few days before the first useful report.

### 2. Reading — let the agent query GA
1. In Google Cloud, create a **service account**; create a JSON key.
2. In GA4 → Admin → Property Access Management, add the service account's email
   with the **Viewer** role.
3. Note the numeric **GA4 property id** (Admin → Property Settings).

### 3. Secrets for the routine
The scheduled agent needs:
- `GA_PROPERTY_ID` — numeric property id
- `GA_SA_KEY` — the service-account JSON (inline), **or**
  `GOOGLE_APPLICATION_CREDENTIALS` — path to the key file
- A GitHub token with repo access (to open the issue/PR) — already available if
  the routine runs with `gh` authenticated.

## The data pull

`scripts/ga-weekly.mjs` returns last-7-days JSON: site totals, per-page views /
users / engagement / avg session duration, and top landing pages.

```bash
GA_PROPERTY_ID=123456789 GA_SA_KEY="$(cat sa.json)" node scripts/ga-weekly.mjs
```

## The weekly routine

Create it with the `/schedule` skill. Suggested cadence: **Mondays 8am**. The
agent prompt (roughly):

> Every Monday: run `node scripts/ga-weekly.mjs` to pull last week's GA stats for
> anystride.com. Compare against the prior week if available. Identify the 3–5
> highest-leverage opportunities — high-traffic pages with weak engagement, pages
> that get no traffic, the /coaching conversion trend, and internal-linking gaps.
> For each, propose a specific, concrete page change (which file, what edit, why).
> Open a GitHub issue titled "Weekly anystride review (wk N)" with the stats
> summary and the prioritized suggestions. Keep suggestions small and testable.

### Output mode (choose one)
- **GitHub issue (default):** a weekly issue with stats + prioritized suggestions
  you can act on. Safe, reviewable, no surprise changes.
- **Issue + draft PR:** additionally open a *draft* PR implementing the top 1–2
  safe changes (copy tweaks, internal links) for review.
- **Email digest:** send the summary to you; make no repo changes.

## Notes / honesty
- GA4 numbers are sampled/approximate at low volume; treat early reports as
  directional.
- The agent suggests; a human reviews and merges. Keep it on a branch + PR so
  nothing ships unreviewed.
- The coaching form fires a GA4 `generate_lead` event on successful signup, so
  /coaching conversion is measured precisely (the weekly pull reports `leads`).
  Mark `generate_lead` as a Key Event in GA4 → Admin → Events to track it as a
  conversion in the dashboard too.
