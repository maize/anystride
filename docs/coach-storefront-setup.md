# Coach storefronts

Implemented October 4, 2026. Coaches have a shareable public profile, reviewed service offers, direct checkout and private purchase records. The first version sells one-time packages and consultations. It does not add recurring subscriptions, scheduling, client messaging, uploaded plan delivery or automatic refund issuance.

## Routes and ownership

- `/coaching/with/[slug]`: published profiles belonging to approved coaching accounts, with approved services only.
- `/account/storefront`: profile and offer editor, preview and payout setup. Coaches must first have an approved application.
- `/account/checkout/[serviceId]`: the exact offer, price, inclusions, delivery and cancellation policy before payment.
- `/account/orders`: purchases and sales, restricted to each order’s buyer and coach. Administrators do not receive blanket order access.
- `/api/marketplace/storefront`: authenticated, same-origin operations. Ownership, prices, payment destinations and payment status are server controlled.
- `/api/stripe/storefront-webhook`: signed platform Stripe events, independently configured from the existing test workspace and live event inbox.

Existing imported directory profiles keep their original URLs and external links. They do not become sellers automatically. A published storefront’s offers link to direct purchase from the coaching account catalog and are excluded from the old public enquiry cards.

## Local preview

The existing local Supabase project must be running. These commands reject non-local or linked Supabase projects and use only `anystride_marketplace_test` / `anystride_payments_test`.

```sh
node scripts/local-marketplace.mjs setup
node scripts/local-marketplace.mjs demo
node scripts/local-marketplace.mjs dev
```

Open `http://localhost:3010/coaching/with/morgan-ellis-demo`. The fictional profile is labelled as a demo and has no payout account. It cannot take payment. The seed is repeatable and does not overwrite existing records. The local development helper keeps storefront payments off by default. For explicit sandbox verification, run `LOCAL_STOREFRONT_SANDBOX=on node --env-file=.env.storefront-sandbox.local scripts/local-marketplace.mjs dev`. The ignored file must contain the storefront test key, platform account ID and Stripe CLI listener signing secret. Live keys are rejected before any database connection; production configuration is not imported. Forward sandbox platform events to `http://localhost:3010/api/stripe/storefront-webhook` during the test. This mode uses 10% commission and the local test database only.

## Database and configuration

Apply `db/migrations/006_coach_storefronts.sql` after `002_marketplace.sql` to the explicitly selected marketplace database. This is an additive migration with RLS, explicit browser-role privilege revocation and no browser access policies. It runs in a transaction with bounded lock and statement timeouts. Applying it is an operator action; deployment does not apply it automatically.

On October 4, 2026, migration 006 was applied to the production Anystride Supabase project `gwwsxrtmlcnisnbphrfq`. All five storefront tables were verified with RLS enabled and no SELECT/INSERT/UPDATE/DELETE/TRUNCATE privileges for either `anon` or `authenticated`. Production Vercel configuration explicitly sets `STOREFRONT_PAYMENTS_MODE=live` and `STOREFRONT_PLATFORM_FEE_BPS=1000` (10%) and binds live platform `acct_1UEsMU2kQ2CrOdug` (US; charges and payouts enabled). The existing live key and the dedicated storefront signing secret are stored as sensitive production environment variables. Webhook `we_1UMrsc2kQ2CrOdugzj8lJIxI` targets `https://anystride.com/api/stripe/storefront-webhook`, uses API version `2026-08-26.dahlia`, and is enabled. The pre-existing live webhook is unchanged. The user authorized live activation and 10% commission on October 4, 2026. Deployment `dpl_48sg9ZdHgingdDxbJbLdYQaH7pBU` rebuilt commit `25615752fe0ca68f02aff1be7fbdfda7a89c7fc6` with this configuration and is aliased to anystride.com.

Storefront payments require the existing marketplace authentication configuration plus:

| Variable | Purpose |
| --- | --- |
| `STOREFRONT_PAYMENTS_MODE` | `off` by default; explicitly select `test` or `live` |
| `STOREFRONT_STRIPE_SECRET_KEY` | Platform key matching the selected mode |
| `STOREFRONT_STRIPE_PLATFORM_ACCOUNT_ID` | Expected platform account; verified against Stripe |
| `STOREFRONT_STRIPE_WEBHOOK_SECRET` | Signing secret for the storefront endpoint |
| `STOREFRONT_PLATFORM_FEE_BPS` | Commission in basis points, defaults to zero; range 0–5000 |

The first payment implementation uses Stripe-hosted Checkout and Express connected accounts in the same country as the platform. New accounts and onboarding links use Stripe Accounts v2, with merchant and recipient configurations. Readiness checks use Stripe's supported v1 account representation to check current charge/payout and transfer capabilities before checkout. Amounts are fixed one-time totals in USD, EUR or GBP, currently limited to 1–1,000 currency units by the existing service model. No automatic tax calculation or subscription billing is implemented.

The auth callback stays exactly `/account/callback`; no new wildcard redirect is needed. A one-hour HttpOnly cookie stores the selected service and is validated and cleared after sign-in. The magic link must open in the same browser. This retains the existing [Supabase redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

## Order lifecycle

Checkout stores the price, terms, onboarding instructions and contact details in an immutable order snapshot. Retrying uses the same Stripe idempotency key and pending order. If an offer changes while an earlier checkout is pending, the buyer must close or reconcile that checkout before buying the new version. Closing an unpaid checkout expires the actual Stripe session before updating local status.

Payment confirmation re-reads the current Stripe session, payment intent and charge. The browser return URL alone never confirms payment. Duplicate or out-of-order events cannot replay stale financial state. Buyers and coaches can also refresh payment status in their private order view. Paid and partially refunded orders show the original instructions and contact details; the buyer’s account email is disclosed on the purchase page before payment and shown to the coach afterward.

Configure platform-account webhook events:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
charge.refunded
charge.dispute.created
charge.dispute.updated
charge.dispute.closed
```

Refunds and disputes are reflected in orders, but operators still initiate refunds in Stripe. With destination charges, coordinate the buyer refund, transfer reversal and application-fee refund; a refund status alone is not evidence that the coach’s transferred funds were recovered. See [Stripe transfer reversals](https://docs.stripe.com/api/transfer_reversals) and [application-fee refunds](https://docs.stripe.com/api/fee_refunds/create). Sales totals shown in Anystride are gross orders, not a bank payout ledger.

If provider account/session creation has an ambiguous outcome for over 23 hours, the app stops creating a replacement automatically. An operator must look up the stored onboarding/order reference in Stripe and reconcile the existing resource before retrying; this avoids recreating resources after Stripe’s idempotency retention window.

## Verification and launch boundary

Automated tests use real PostgreSQL-compatible SQL through PGlite and an isolated Stripe simulator. They cover publication/review, ownership, private data, API validation, checkout retries, changed-price conflicts, closed sessions, payout onboarding, payment verification, refunds, disputes and webhook replay. Authentication tests cover safe return-to-offer routing. The public profile and purchase page were checked in the browser at desktop and 390px mobile widths, including purchase links, disabled-payment messaging and horizontal fit.

On October 4, 2026, the real Anystride Stripe sandbox was exercised against the application payment functions and webhook route, using an isolated PGlite database and fictional buyer/coach identities. No production order data was written. Verified:

- A repeated checkout request reused the same Stripe Checkout session.
- Stripe's insufficient-funds test card was rejected, leaving the order pending.
- A $200 test-card purchase completed with a $20 application fee; a real signed `checkout.session.completed` delivery returned HTTP 200 and changed the database order to paid.
- A $50 partial refund reversed $50 of the transfer and refunded $5 of the application fee; the real signed `charge.refunded` delivery returned HTTP 200 and changed the order to partially refunded.
- Closing a separate unpaid checkout expired it both at Stripe and in the database.
- Accounts v2 created a new Express test account and a hosted onboarding link. Fictional identity and test bank details were accepted. The agreement was submitted with user authorization; Stripe confirmed charges, payouts and transfers enabled with no outstanding requirements. Checkout creation and cancellation also passed against this new Express account. The completed payment/refund test used a pre-existing, ready sandbox connected account.

Sandbox payment reference: `pi_3UMrQn2jFbP5Yg4b1qYtAqPw` on sandbox platform `acct_1UEsMa2jFbP5Yg4b`. The user confirmed the tested 10% fee for production.

Live activation checks passed: 24 storefront/authentication tests; production signed-in coach workspace; live platform charge/payout readiness; correctly signed live probe returned HTTP 200; invalid signatures and sandbox-mode probes returned HTTP 400. The dedicated webhook was then enabled. Probes used ignored event types and created no live orders or charges. The production coach workspace now offers payout setup. Individual coaches still need live payout onboarding, a published profile and approved services. A fresh hosted magic-link round trip, real live purchase, Stripe-originated live financial event delivery and bank payout were not tested; return-to-offer behavior is covered by automated tests. Tax handling and payout/refund operations remain operator responsibilities.


## Coach launch experience and browser verification

The coach workspace now shows profile publication, approved/available service and Stripe readiness as three separate steps. Commission is read from the server configuration and shown with a $100 example before payout setup. Connected coaches can open their Express dashboard through a fresh, owner-bound [Stripe login link](https://docs.stripe.com/api/accounts/login_link/create); the browser cannot supply a connected-account ID. Stripe remains the source for balances and payout timing.

On October 4, 2026, the user requested a test name. A local-only “Morgan Ellis — Test Coach” storefront was published at `/coaching/with/morgan-ellis-test` with an approved $200 fictional service and the verified Express sandbox account. No fictional seller was published to production. Browser verification passed:

- Coach checklist showed all three steps complete and a 10% commission example.
- The dashboard button opened Stripe Express; test-code verification reached balances, transactions and reports.
- Starting on the public profile, a signed-out buyer selected the service, requested a magic link captured by local Mailpit, and returned to that exact service after sign-in.
- The buyer completed Stripe-hosted sandbox checkout. Event `evt_1UMsjT2jFbP5Yg4bPQY1ZDcY` returned HTTP 200 from the running Next.js webhook route.
- Order `128ec0ed-aecf-4aa3-8e94-e68d9df6edc8` displayed Payment confirmed and the original next steps/contact details. Stripe confirmed 20,000 cents paid, a 2,000-cent application fee and destination `acct_1UMrHl2jFbIhw5yb` with `livemode=false`.
- 25 focused storefront/auth tests, TypeScript and targeted lint passed, including owner isolation and same-origin validation for dashboard access.

These follow-up changes are included in the onboarding and signup-alert release. The production activation described above remains unchanged. Actual live coach identity/bank onboarding and a real purchase/bank payout still require real participants; the fictional profile cannot verify those steps.


## Open coach applications

On October 4, 2026, the user authorized public signup with admin approval. The production `MARKETPLACE_PILOT_EMAILS` invitation list was removed; the existing application treats an absent list as open registration. `MARKETPLACE_MODE=pilot` remains the existing feature-enable value, not a signup restriction. Supabase production settings were verified: new-user signup and email authentication enabled, email confirmation required, anonymous sign-in disabled.

Anyone can create a verified account and submit a coach application. New applications remain pending; only configured administrators can approve coaches. Unapproved coaches cannot create services, publish storefronts or start payout onboarding. Service review and Stripe readiness remain required before sales. Buyers need a verified account but do not need coach approval. No admin IDs or approval rules were changed.

Deployment `dpl_4gVHJeTXMJi8SU9aYjTjbfhXK2yZ` is READY and aliased to anystride.com with the invitation restriction removed. This redeployed the existing production source; the follow-up enhancements are tracked in the subsequent onboarding release. All 38 account, marketplace and storefront tests passed.


## Onboarding improvements

Signup now defaults to the coach journey, with a separate athlete entry and unchanged checkout intent. The exact `/account/services` path is now an allowed authentication return destination, so coaches reach their application after email verification. Other arbitrary account paths, external URLs and query-bearing application paths remain rejected. The email form has a confirmation state with same-browser instructions, recovery guidance and a way to change the email or request another link. Application guidance explains the private review stage; approved coaches are directed to the storefront checklist.

Verified the signup page at 390px without horizontal overflow, the locally captured email request and its confirmation state, and the callback redirect with automated tests. These changes do not approve coaches automatically or alter Stripe configuration.


## Owner signup alerts

`notifyVerifiedSignup` schedules an owner email after a successful authentication callback for a verified, non-anonymous user. It uses the existing Resend sender/key and `NOTIFY_EMAIL` (default `matthias.e.link@gmail.com`). The message identifies the account email and links to admin reviews, without treating signup as a coach application. Existing coach/service review alerts remain separate.

Activation requires deploying this release and setting production `MARKETPLACE_SIGNUP_NOTIFICATIONS=email` plus `MARKETPLACE_SIGNUP_NOTIFICATIONS_SINCE` to the activation time in ISO format. Users created before that time are excluded. Preview and local environments never send these alerts. No database migration is needed: an advisory lock and the existing server-only audit table durably claim one attempt per user, with an additional Resend idempotency key.

Delivery is best effort, not a durable retry queue. A failed or interrupted attempt is logged and is not automatically resent on subsequent sign-ins, preventing repeated owner emails. Only verified users returning through the application callback trigger this alert; accounts created outside this flow do not. Email delivery never blocks authentication.


Release configuration: production signup alerts are set to `email`, with the cutoff `2026-10-04T19:37:01.126Z` and recipient `matthias.e.link@gmail.com`. The new deployment will activate this configuration. All 50 relevant auth, marketplace, storefront and notification tests passed, along with TypeScript. Actual inbox delivery has not yet been verified.
