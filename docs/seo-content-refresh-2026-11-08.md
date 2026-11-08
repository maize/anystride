# SEO content refresh — November 8, 2026

Source: https://x.com/asaio87/status/2119171723849245031

Status: first-page implementation prepared for the user-authorized Git push on November 8. Production deployment and indexing are not verified.

## Baseline and top 10

Search Console property sc-domain:anystride.com; Google Web search; August 8–November 5, 2026. The connector uses a three-day reporting lag. Retrieved November 8, with limits of 1,000 page rows and 10,000 page/query rows; returned 92 and 154 respectively. Query data can omit anonymized searches; do not sum query rows to reconstruct page totals. Small samples do not establish growth or causality.

Sorted by clicks descending, then impressions descending:

| Page | Clicks | Impressions | Average position |
| --- | ---: | ---: | ---: |
| /plans/pfitzinger-18-55 | 3 | 27 | 31.3 |
| / | 2 | 36 | 30.8 |
| /running-coaches/san-francisco | 1 | 66 | 15.8 |
| /coaching/coach-coachnih | 1 | 1 | 4 |
| /training-plans/5k | 0 | 68 | 42.5 |
| /guides/running-cadence | 0 | 57 | 80.3 |
| /plans/higdon-marathon-novice-1 | 0 | 27 | 21.2 |
| /guides/treadmill-vs-outdoor-running | 0 | 24 | 85.6 |
| /racers/yomif-kejelcha | 0 | 18 | 45.4 |
| /guides/running-in-heat | 0 | 15 | 75.1 |

## First page: Pfitzinger 18/55

| Query | Clicks | Impressions | Average position |
| --- | ---: | ---: | ---: |
| pfitz 18/55 | 1 | 4 | 14.5 |
| pfitz 18 55 | 0 | 1 | 8 |
| pfitz running plan | 0 | 1 | 73 |
| pfitzinger 18/55 | 0 | 1 | 8 |
| pfitzinger 18/55 plan | 0 | 1 | 18 |

The position-10–30 opportunities are “pfitz 18/55” and “pfitzinger 18/55 plan” (five impressions combined). All visible queries concern the existing plan; no separate FAQ or new article is justified by these data.

## Implemented

- Shortened the title to “Pfitz 18/55 Marathon Plan: Mileage & Overview”, including the primary query. The existing description already includes it and remains unchanged.
- Opening paragraph explains the name, duration and peak mileage immediately, expands “mpw”, and retains the Pfitzinger name.
- Corrected six-day frequency to five in plan data and both fit paragraphs, using the publisher's excerpt.
- Replaced the generic Reddit wiki source with the publisher's book page.
- Kept existing contextual links to the plan-selection guide and marathon-plan comparison. Kept the at-a-glance definition list; another graphic would not clarify this small query gap.
- Shared summary and frequency also appear in existing cards/comparisons.
- Preserved unrelated edits and did not rewrite the full article. No personal experience or results were invented.

Primary sources checked November 8:
- https://us.humankinetics.com/products/advanced-marathoning-4th-edition — authors, duration choices and mileage bands.
- https://us.humankinetics.com/blogs/excerpt/what-to-do-when-your-marathon-training-gets-interrupted — five-day frequency for the up-to-55-mile schedule.

Optional firsthand addition: Matthias's own experience fitting a midweek longer run around work, if applicable. No account of that experience has been supplied.

## Release and measurement

After a separately authorized release, record the deployment date and request indexing for the updated URL. Recheck queries after 7–14 days and compare equal mature windows after 28 days. Track page clicks, impressions and CTR plus the two priority queries. Small counts and query omissions limit inference. No indexing request for unpublished changes or new recurring automation was created.

Following the post's page-by-page approach, this pass stops after page 1. Next candidates for query-level review: San Francisco coaches (1 click, 66 impressions, position 15.8) and Higdon Novice 1 (0 clicks, 27 impressions, position 21.2). The top 10 is a review queue, not an instruction to rewrite every page.

Verification: focused ESLint, TypeScript and diff checks passed. The push is based on the latest origin/main; unrelated local work is excluded.
