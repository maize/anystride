# anystride → Coach Marketplace: Competitive Analysis

> Extending anystride from free training plans into a two-sided marketplace that
> connects runners with coaches — and, crucially, helps runners judge **how good
> a coach actually is** before they pay.

## 1. The problem (jobs-to-be-done)

A runner who has outgrown a generic plan wants personalized coaching but faces
three hard problems, in order:

1. **Discovery** — "Where do I even find a running coach?" (Google, Reddit, local
   club word-of-mouth, Instagram.)
2. **Trust / quality signal** — "Is this coach actually good, and good *for me*?"
   This is the painful one. Certifications (RRCA, USATF, UESCA) prove a coach took
   a course, not that they get results. Reviews are sparse, gameable, or absent.
3. **Fit & commitment** — "Will their style, communication, price, and specialty
   (5K speed vs. first marathon vs. injury comeback) match me?" — usually only
   discoverable *after* paying for a month.

The coach side has a mirror problem: **client acquisition**. Most independent
coaches are great at coaching and bad at marketing; they live on referrals and
Instagram and would happily pay for qualified leads.

The core unmet need is **#2 — a credible quality signal** — and almost no one
serves it well. That's the wedge.

## 2. Competitive landscape

### A. Free / adaptive apps (the "good enough for most" baseline)
| Player | What it is | Strength | Gap it leaves |
|---|---|---|---|
| **Garmin Coach** | Free adaptive plans from named coaches, on-device | Free, huge install base, adaptive | Not a *human* relationship; device-locked |
| **Nike Run Club** | Free guided runs + plans | Free, brand, audio coaching | Generic, no personalization or accountability |
| **Strava** | Now bundles plans + huge social graph | Audience, social proof, data | Not real coaching (yet — see Runna) |

### B. AI / hybrid subscription coaching (the fast-growing middle)
| Player | What it is | Notes |
|---|---|---|
| **Runna** | Coach-designed + AI-personalized plans, ~$15–20/mo. **Acquired by Strava (2025).** | The category breakout. Now backed by Strava's audience — a serious threat to the "personalized plan" layer. |
| **Vert.run, Humango, Athletica, TriDot** | AI adaptive coaching | Cheap, scalable, improving fast — they commoditize *plan generation*, not *human relationship*. |
| **Runcoach / McMillan** | Algorithm + optional human | Established brands, calculators as funnel. |

### C. Software *for* coaches (delivery rails, weak discovery)
| Player | What it is | Notes |
|---|---|---|
| **TrainingPeaks** | The dominant tool coaches use to deliver plans; has a **"Find a Coach" directory** | Directory exists but is a lead list, not a vetted/reviewed marketplace. Quality signal is weak. Being absorbed into the same orbit (Outside Inc.). |
| **Final Surge** | Similar coach-delivery platform | Free-ish, coach-friendly, also has a directory. |
| **Coachem, Today's Plan** | Coaching delivery software | Tooling, not discovery. |

### D. Marketplaces / directories (closest to the idea — and mostly weak or gone)
| Player | What it is | Notes |
|---|---|---|
| **RunDoyen** | Marketplace matching runners to *vetted* coaches with a quiz | Closest analog to the vision — proved the model but never reached scale; effectively dormant. A cautionary + validating data point. |
| **CoachUp** | General sports coaching marketplace (mostly in-person) | Broad, not running-specific, in-person bias. |
| **RRCA / USATF / UESCA "Find a Coach"** | Certification-body directories | Free, credible-ish, but **certification ≠ quality**, no reviews, terrible UX. |
| **Upwork / Fiverr / Thumbtack** | Generalist freelancer marketplaces | Some running coaches list here; no domain trust, race-to-bottom pricing. |

### E. Adjacent / social
- **Reddit (r/running, r/AdvancedRunning), Instagram, local run clubs** — where
  trust *actually* gets built today, informally. This is also anystride's source
  of authority and audience.

## 3. Where the gap is

Map the players against the two axes that matter — **human relationship** and
**credible quality signal**:

```
 high human relationship
        │
        │   Independent coaches        ◀── anystride's
        │   (great coaching,               target zone:
        │    invisible quality)            real coaches +
        │                                  a trustworthy
        │   TrainingPeaks/RRCA             quality signal
        │   directories (lead lists,
        │    weak signal)
        │
        │   Runna / AI apps      Garmin/NRC
        │   (scalable, not human)  (free, generic)
        └─────────────────────────────────── high quality signal
```

**Nobody owns the top-right.** Directories have humans but no signal; AI apps have
signal-by-data but no human; certification lists have a weak proxy signal. The
defensible position is a running-specific marketplace whose **core product is the
quality signal**: vetting + transparent outcomes + structured reviews + good
matching.

## 4. anystride's wedge ("right to win")

The free-plans product isn't a side project — it's the **top of the funnel and the
trust engine** for the marketplace:

1. **Audience for free.** SEO-friendly, genuinely free community plans pull in
   exactly the runners who will later want a coach (people mid-plan, plateauing,
   training for a first marathon). Cheap acquisition vs. competitors buying ads.
2. **Built-in intent signal.** A runner finishing "Bridge to 10K" or browsing
   marathon plans is a warm lead for "want a coach for your next goal?"
3. **Trust transfer.** anystride already positions as *community-sourced and
   honest*. Extend that into the thing runners can't get elsewhere: an honest read
   on coach quality.

### The differentiator: make quality legible
Concrete mechanisms competitors don't combine:
- **Vetting tier** (verified certs + experience + a real coaching sample), shown as
  a clear badge — not a self-serve listing.
- **Structured, outcome-oriented reviews** ("trained for: first marathon; result:
  finished / PR'd; communication: weekly") instead of star-mush.
- **Transparent specialties & pricing up front** — filter by goal (5K speed, BQ
  attempt, injury return, masters, trail/ultra), price, format, communication
  cadence. Kill the "find out after you pay" problem.
- **Low-risk trial** — a structured intro call or 2-week trial standardized across
  coaches, so fit is testable before commitment.
- **Free-plan → coach bridge** — "You just finished C25K. These three coaches
  specialize in getting new runners to their first 10K."

## 5. Risks & realities

- **Two-sided cold-start.** Need coaches *and* runners. Mitigant: seed the supply
  side from the same Reddit/coach community anystride sources plans from; demand
  comes free from the plans funnel.
- **Disintermediation.** Once matched, runner + coach can take it off-platform.
  Mitigant: be the delivery + payments + accountability layer (recurring value),
  not just a dating site. This is why directories fail and TrainingPeaks persists.
- **Strava + Runna.** They own data, audience, and now a personalized-plan product.
  But they're pushing *software/AI coaching*, not *human marketplace + quality
  signal* — a different, less-served job. Position against them, don't copy them.
- **Vetting doesn't scale for free.** Quality signal is expensive to maintain
  (that's exactly why it's defensible). Start narrow: one distance/region, hand-vet.
- **RunDoyen already tried and stalled.** The model is validated *and* hard;
  execution on funnel + signal is everything. anystride's free-plan funnel is the
  asset RunDoyen lacked.

## 6. Monetization options
- **Take rate** on coaching transactions (10–20%), standard marketplace model.
- **Coach subscription** for premium placement / lead access (directory model).
- **Lead-gen fee** per qualified intro.
- Keep **runner-side free** — runners are the scarce, ad-acquired-elsewhere side;
  monetize coaches who desperately want clients. (Free plans stay free forever.)

## 7. Recommendation

- **Phase 1 (now):** ship the free plans, build SEO + audience + trust. Instrument
  intent (which distances/levels people browse, plan completions).
- **Phase 2:** add a lightweight, hand-vetted **coach directory** in *one* niche
  (e.g. "first marathon" coaches), with structured profiles and the quality-signal
  reviews. Validate that plan-funnel traffic converts to coach interest.
- **Phase 3:** become the **marketplace** — matching quiz, trials, payments,
  delivery — only after the directory proves demand and the quality signal earns
  trust.

The free plans give anystride the one thing every failed coach-marketplace lacked:
a cheap, trusted, high-intent funnel. The wedge isn't "another place to list
coaches" — it's **"the place that finally tells you if a coach is any good."**
