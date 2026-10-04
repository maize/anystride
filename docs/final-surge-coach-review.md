# Selling coaching services on Anystride

Updated October 4, 2026. Anystride's focus is to help coaches attract clients, package their services, accept payment, and manage the commercial relationship. Coaches can deliver training through their existing tools. The first product milestone is a completed service sale followed by clear onboarding.

The coach's beautiful public profile is the storefront: athletes should learn who the coach is, see their services, and buy an available service directly. The marketplace helps athletes discover these profiles. A coach should be able to share their profile with clients they bring themselves, even before the marketplace generates meaningful demand.

## The service purchase journey

The recommended purchase flow centers on the public coach profile:

1. A coach creates a profile, defines a service, completes payout setup, and submits the offer for publication.
2. An athlete discovers the profile through the marketplace or the coach's shared link, compares the listed services, and selects one.
3. The athlete sees the full price, billing frequency, availability, deliverables, and start process, then proceeds directly to checkout for an available service.
4. The athlete pays and receives a receipt, an order summary, and onboarding instructions.
5. The coach sees a paid client and the intake information needed to start. The athlete can see what they purchased, how delivery works, and how to contact the coach.

Payment confirmation must come from verified payment events. Enquiry acceptance and returning from checkout are not proof of payment. Prices and deliverables should be preserved with the order, so later edits to a public offer do not change an existing purchase.

Direct purchase is the default for published, available services. Coaches control capacity and whether an offer is open for purchase. Keep enquiry or application flows for custom work and explicitly application-only services. A standard purchase should not require a conversation or coach approval first.

## The public profile design

The page should feel like a coach's professional website, with a clear path from trust to purchase. Use Anystride's typography and colour system with generous spacing, a prominent portrait, and a considered editorial layout. Give the coach's identity and services the strongest visual emphasis.

Recommended page order:

1. **Introduction.** Coach name, portrait, a short description of who they help, specialities, remote or local availability, and a prominent link to their services.
2. **Services.** Put purchasable offers near the top. Each card shows the service name, who it suits, concrete inclusions, price and billing interval, duration, start expectations, and a specific purchase button.
3. **Approach and experience.** Explain how the coach works and what a client can expect. Show relevant credentials and genuine evidence of experience.
4. **Client feedback.** Display authentic reviews when available, with clear attribution. Omit an empty testimonial section.
5. **Getting started and common questions.** Explain payment, onboarding, communication, delivery tools, and cancellation. Include an enquiry option for someone who needs help choosing.

On desktop, use the portrait and introduction to establish personality while keeping the service choices easy to find. On mobile, bring the first offer into view quickly and provide a persistent View services link. Checkout must remain tied to the specific service the athlete selected.

Offer examples include monthly coaching, a fixed race-preparation package, and a consultation. Use buttons such as **Start monthly coaching**, **Buy package**, or **Book consultation**, with the actual amount and billing interval visible nearby. A selected offer's detail or checkout page can explain the full terms without making athletes hunt for the price.

## What coaches need to sell

The following are proposed Anystride features. Examples describe possible offers, not existing coach listings or recommended prices.

| Capability | First useful version |
| --- | --- |
| Coach storefront | A stable public URL, photo, professional background, specialities, approach, service cards, and availability. Clearly distinguish coach-owned profiles from unclaimed directory entries. |
| Service editor | Title, intended athlete, deliverables, communication frequency, price, duration, delivery method, start process, capacity, and cancellation information. Include a preview of the public offer and draft/published states within the existing review process. |
| Fixed packages | Offers such as a twelve-week race preparation package or a training-plan review, purchased with a single payment. |
| Monthly coaching | A recurring offer with explicit billing frequency, included support, renewal terms, and a cancellation path. Build immediately after the fixed-package purchase lifecycle. |
| Checkout and payouts | Payment collection, coach payout onboarding, receipts, order status, refund handling, and clearly disclosed platform fees once a fee model is chosen. |
| Client onboarding | A short intake form for goals, experience, availability, and agreed start date, followed by specific next steps and the coach's contact or delivery link. |
| Sales management | Enquiries awaiting a response, orders awaiting payment, active clients, subscriptions, and payment problems. |
| Business reporting | Paid sales, refunds, platform fees, coach earnings, and payout status. Keep gross sales distinct from money paid out. |

Consultations can initially use a coach-provided scheduling link. Downloadable plans, group programs, discount codes, bundles, and extensive branding controls can follow once the main service flow is working.

## The relevant Final Surge reference

Final Surge's Coaching Business product is the closest reference for this direction. It combines coach sales pages, monthly subscriptions, fixed-length programs, intake forms, and payout setup. [Coaching Business overview](https://www.finalsurge.com/coaching-business)

Its subscription editor separates offer details, pricing, visibility, onboarding, confirmation, welcome email, and social sharing. It also alerts coaches about cancelled subscriptions and failed payments. Anystride can adopt those functional needs with a simpler service editor and sensible defaults. [Subscription guide](https://support.finalsurge.com/hc/en-us/articles/15636019383063-Getting-Started-with-Recurring-Subscriptions)

The design recommendation is to make creating a clear, purchasable offer the main coach action. Training calendars, interval builders, activity imports, performance analytics, social walls, and attendance tools are outside the initial sales platform scope. External delivery links do not require integrations with those services.

## What Anystride already has

The local application includes authentication, coach applications, service review, approved service discovery, athlete enquiries, and coach acceptance or decline. Those pieces can support the proposed purchase journey. See the [marketplace data model](/Users/matthias/anystride/db/migrations/002_marketplace.sql) and [coach workspace](/Users/matthias/anystride/src/app/account/(workspace)/services/page.tsx).

The most relevant gaps are:

- **Storefront ownership and offers.** Existing directory profiles can be unclaimed and currently direct athletes to external contact or websites. Link approved seller accounts to their public profiles before enabling sales, and display their approved offers on those pages. Directory publication alone does not establish seller ownership. See the [coach profile page](/Users/matthias/anystride/src/app/coaching/[slug]/page.tsx).
- **A richer service definition.** The existing [service fields](/Users/matthias/anystride/src/components/CoachServiceFields.tsx) cover title, description, total price, currency, and weeks. Add explicit service type, deliverables, delivery method, purchase process, availability, and billing frequency.
- **Production checkout and payouts.** [Checkout](/Users/matthias/anystride/src/lib/payment-checkout.ts) already contains test payment and coach-transfer logic, but [payment configuration](/Users/matthias/anystride/src/lib/payment-config.ts:17) deliberately accepts only test mode. Production payment handling needs its own implementation and verification.
- **Paid orders and subscriptions.** The [live Stripe event inbox](/Users/matthias/anystride/src/lib/stripe-event-inbox.ts) observes events without granting access or updating bookings. It does not implement the purchase lifecycle. Monthly billing also needs recurring-payment states and cancellation handling.
- **Client handoff.** [Private coaching messages](/Users/matthias/anystride/src/lib/sandbox-workspace.ts:18) are currently restricted to a sandbox disabled in production. The first sales release needs a durable order page, onboarding instructions, and a clear way to reach the coach; a full messaging product can follow.

These are findings from local source inspection, not verification of production settings or deployed database state.

## Recommended coach navigation

Use **Overview, My Profile, Services, Orders, Clients, and Earnings**, with enquiries available for custom work. The profile editor should include a clear public preview and shareable URL.

The overview should show actions that affect the coach's business: finish payout setup, publish a service, respond to an enquiry, start onboarding a paid client, or address a payment problem. Each item should open the corresponding task directly.

The athlete account should center on requests, purchases, active coaching, onboarding, and billing. Every purchased service should explain what happens next, when the coach will respond, and where coaching is delivered.

## Build sequence

1. **Build the shoppable profile.** Connect coach-owned profiles to approved offers; create the public profile layout, service cards, offer details, and public preview; add capacity controls and direct purchase entry points. Keep enquiries for services that explicitly require them.
2. **Complete one real purchase lifecycle.** Add production payout onboarding, service checkout, verified payment processing, order records, receipts, refunds, and a coach earnings view. Validate the entire flow in test mode before enabling live sales. Show a purchase button only when the service can actually be bought.
3. **Complete onboarding and handoff.** Collect intake answers, show an agreed start date and delivery instructions, and give both parties a durable record of the engagement.
4. **Add monthly coaching.** Support recurring billing, renewals, failed payments, cancellation, and the matching client status. Preserve access and payment history according to the agreed service terms.
5. **Improve conversion and repeat business.** Add verified purchaser reviews, better comparison filters, referral attribution, service performance reporting, and repeat purchases based on actual pilot feedback.

The first release is successful when a coach can publish one approved package on a beautiful public profile, share its link, and receive a verified paid order from an athlete who bought directly from that page. Both parties must then know what happens next. Failed, refunded, and duplicate payment events must produce the correct order state. Unrelated users must not be able to read another client's order or intake answers.

## Proposed implementation model

Extend the existing application with seller accounts linked to coach profiles, richer service versions, orders, onboarding responses, and engagements. Add subscriptions when recurring billing is introduced. Preserve the existing server-side ownership checks and the snapshot of terms agreed at purchase. The existing enquiry model can remain for optional custom offers; ordinary checkout should not depend on an accepted enquiry.

Keep commercial states distinct: an order can be paid before onboarding is complete, and a client engagement can begin on a later date. Subscription cancellation should record when service actually ends. Check price, publication status, seller readiness, and capacity on the server when checkout starts. Reserve limited capacity during checkout and reconcile expiry or delayed payment events to prevent overselling. Store enough payment references and event history to reconcile retries, refunds, and delayed provider events without creating duplicate orders.

The commercial model remains a product decision. For the pilot, a clearly disclosed fee on completed sales is a reasonable hypothesis to test; the rate, responsibility for processing fees, and treatment of coach-sourced clients are still undecided. Track profile visits, service selection, checkout completion, repeat purchases, coach earnings, refunds, and coach retention. Start by proving that coaches can sell successfully through their own links, then measure the additional clients Anystride's marketplace brings them.

## Scope of the Final Surge account review

The existing Final Surge session was already signed in as a coach. The live account showed:

- A Coaching Dashboard with Athlete Listing, Team Calendar Listing, Athlete Workout Report, and Athlete Zone Report tabs.
- An empty Default Team and no team calendars.
- A calendar empty state explaining that athletes must accept a coaching invitation before their training becomes accessible.
- A Training Plans area with All Plans, Sell Plans, Transaction List, and Sales Setup tabs, plus an empty Default Library and an Add Library control.
- A Create Training Plan form with a library selector, name, description, and week count. No plan was submitted.
- Navigation for notifications, Social Wall, Mailbox, and Message Boards.

These observations establish which controls were available, not that every workflow was exercised. The empty roster prevented a review of populated athlete calendars and reports. Further browser interaction was interrupted by changes to the active Chrome tab. The business capabilities discussed above were checked against Final Surge's official product pages and support articles; they were not tested in this account. No invitations, messages, purchases, or saved plans were submitted.
