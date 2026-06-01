# Weekly analytics review agent

A scheduled agent that, **every week**, pulls Google Analytics stats for
anystride.com, finds what's under-performing, and opens a GitHub issue proposing
concrete page changes.

## Architecture

All Google credentials live in **Vercel env** (like the database). The site
exposes a token-protected endpoint that returns weekly stats; the scheduled agent
just fetches that one URL — it never holds Google credentials.

```
GA4 (gtag, NEXT_PUBLIC_GA_ID)  ──►  Google Analytics
                                          │ GA4 Data API
                                          ▼
              /api/ga-weekly  ◄── GA_SA_KEY + GA_PROPERTY_ID (Vercel env)
                    │  (token-protected by GA_REPORT_TOKEN)
                    ▼
        Weekly Claude agent (cron via /schedule)
                    │  fetch stats → analyze → suggest
                    ▼
        GitHub issue: "Weekly anystride review (wk N)"
```

## One-time setup

### 1. Collection (already live)
GA4 is loaded site-wide (`NEXT_PUBLIC_GA_ID`, default `G-QHBHKRHCZJ`). The coaching
form fires a `generate_lead` event on signup. In GA4 → Admin → Events, mark
`generate_lead` as a **Key Event** so it counts as a conversion.

### 2. Let the site read GA (OAuth as your own account — recommended)
GA wouldn't accept a service account here (org restriction), so authenticate as
your own Google account, which already has GA access.

1. Google Cloud → APIs & Services → **enable "Google Analytics Data API"**.
2. Configure the **OAuth consent screen**, scope `.../auth/analytics.readonly`.
   To get a **non-expiring** refresh token: set User type **Internal** (Workspace)
   **or** **Publish** the app to Production (personal accounts) — apps left in
   "Testing" expire refresh tokens after 7 days.
3. Create an **OAuth client ID → Desktop app**; copy its client id + secret.
4. Get a refresh token:
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=… GOOGLE_OAUTH_CLIENT_SECRET=… node scripts/oauth-setup.mjs
   ```
   Approve in the browser; the refresh token prints in your terminal.
5. In Vercel → Settings → Environment Variables, add and redeploy:
   - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
     `GOOGLE_OAUTH_REFRESH_TOKEN`
   - `GA_REPORT_TOKEN` = a long random string
   - `GA_PROPERTY_ID` = `539727341` *(optional — already the default)*

*(Alternative: a service account with Viewer on the property, set as `GA_SA_KEY`.
The code supports both; OAuth is used when present.)*

### 3. Verify
```bash
curl "https://anystride.com/api/ga-weekly?token=GA_REPORT_TOKEN"
```
Returns JSON: site totals, per-page views/users/engagement, `leads` (coaching
conversions), and top landing pages for the last 7 days.

## The weekly routine

Create it with the `/schedule` skill (cadence: **Mondays 8am**). The agent prompt:

> Every Monday, GET `https://anystride.com/api/ga-weekly?token=<GA_REPORT_TOKEN>`
> for last week's anystride.com stats. Compare with the previous week if you have
> it. Identify the 3–5 highest-leverage opportunities — high-traffic pages with
> weak engagement, pages getting no traffic, the `leads` (coaching) conversion
> trend, and internal-linking gaps. For each, propose a specific, concrete page
> change (which file in the repo, what edit, and why). Open a GitHub issue in
> maize/anystride titled "Weekly anystride review (wk N)" with a short stats
> summary and the prioritized, testable suggestions. Suggest only — do not push
> changes.

The routine needs the `GA_REPORT_TOKEN` value and `gh` authenticated for
maize/anystride (to open the issue).

## Notes
- GA4 needs a few days of traffic before the first report is meaningful.
- The agent suggests; a human reviews and acts. Nothing ships unreviewed.
