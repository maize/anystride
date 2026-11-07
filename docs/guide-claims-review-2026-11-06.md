# Guide claims review — November 6, 2026

Reviewed all 17 guides in `src/data/guides.ts`. Revised 13 locally; retained the
four previously sourced guides without changing their dates. This is an editorial
source review, not independent clinical review. No release was made.

## Changes and evidence

| Guide | Correction | Evidence used |
| --- | --- | --- |
| Race preparation | Replaced universal preparation ranges and injury-free promises with named programme examples and entry requirements. | NHS Couch to 5K; Hal Higdon's original 10K, half-marathon and marathon schedules; NHS running-injury guidance. |
| Training paces | Removed guaranteed performance benefits, fixed pace offsets and claims that calculator outputs are exact. | Jack Daniels' training definitions on V.O2; local calculator implementation. |
| Choosing a plan | Removed inevitable-injury language and broad method rankings; corrected weekly-time arithmetic and plan-finder description. | Original Higdon entry requirements, NHS guidance and local product behaviour. |
| Marathon taper | Removed universal percentage prescriptions and reassurance that pain proves the taper is working. | Wang et al. (2023) systematic review; Higdon's marathon schedule; NHS pain guidance. |
| Hitting the wall | Removed fixed depletion distances, guaranteed prevention/finishing and universal gel counts. Distinguished severe symptoms from ordinary fatigue. | Australian Institute of Sport carbohydrate guidance; Wilderness Medical Society hyponatremia guideline; CDC heat illness guidance. |
| Running in heat | Removed fixed temperature/pace formulas and guaranteed acclimatization benefits. Corrected the sweating misconception and overdrinking advice. | CDC heat guidance; Wilderness Medical Society guideline. |
| Strength training | Separated evidence about performance from injury-prevention promises; removed exact recovery and benefit claims. | Blagrove et al. (2018) systematic review; NHS pain guidance. |
| Run/walk | Removed joint-protection and guaranteed speed claims, arbitrary six-hour finish condition and unverified research attribution. | Hottenrott et al. (2016) randomized study; NHS beginner and injury guidance. |
| Negative splits | Corrected equal-half definitions and removed universal performance claims and prescribed second-half improvements. | Muñoz-Pérez et al. (2020) observational Berlin Marathon study; explicitly limited inference from its selected sample. |
| Tempo runs | Removed “every runner needs” framing, exact pace offsets, mandatory dose and cooldown claims. | Daniels' definitions; local calculator estimates. |
| Treadmill vs outdoors | Limited the 1% recommendation to the original study conditions; removed injury and identical-adaptation claims. | Jones and Doust (1996), nine trained male runners and short test bouts. |
| Base building | Removed guaranteed injury prevention, fixed return-from-injury timelines and the 10% rule as a safety threshold. | Buist et al. (2008) randomized novice-running trial; NHS guidance. |
| Hill training | Removed claims of lower injury risk, fatigue-free strides, universal doses and treadmill/downhill equivalence. | Barnes et al. (2013), 20 trained runners; NHS guidance. |

Each revised guide contains links to its sources and identifies research or
programme examples in the relevant prose. Practical examples are not presented
as experimentally established prescriptions. Study findings are not promises
about an individual runner.

## Reviewed without changes

- **Couch to 5K:** already distinguishes 30 minutes from 5K, allows repeated weeks
  and cites the NHS programme.
- **Fueling for long runs:** already qualifies carbohydrate targets, calculates
  gels from their labels and cautions against overdrinking; references AIS,
  Better Health Channel and Wilderness Medical Society guidance.
- **Running cadence:** already distinguishes acute loading results from injury
  prevention and acknowledges uncertainty in longer-term outcomes; cites
  Heiderscheit et al. and Anderson et al.
- **Rest days:** already uses schedules as examples, allows individual recovery
  and directs persistent pain to assessment; cites NHS guidance.

## Verification

- All 17 guide URLs returned HTTP 200 from the existing local server on port 3010.
- Rendered Article metadata, FAQ structured data, canonical URLs and source links
  agree with guide data. Related plan slugs resolve and sitemap revision dates agree.
- Exactly 13 guide records changed; all slugs and the other four records remain intact.
- Targeted ESLint and TypeScript checks passed.
- Existing roadmap and Search Console tests: 11 passed.
- No browser tests, production deployment, commit or push.
