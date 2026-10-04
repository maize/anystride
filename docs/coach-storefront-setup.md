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

Open `http://localhost:3010/coaching/with/morgan-ellis-demo`. The fictional profile is labelled as a demo and has no payout account. It cannot take payment. The seed is repeatable and does not overwrite existing records. The local development helper keeps storefront payments off.

## Database and configuration

Apply `db/migrations/006_coach_storefronts.sql` after `002_marketplace.sql` to the explicitly selected marketplace database. This is an additive migration with RLS, explicit browser-role privilege revocation and no browser access policies. It runs in a transaction with bounded lock and statement timeouts. Applying it is an operator action; deployment does not apply it automatically.

On October 4, 2026, migration 006 was applied to the production Anystride Supabase project `gwwsxrtmlcnisnbphrfq`. All five storefront tables were verified with RLS enabled and no SELECT/INSERT/UPDATE/DELETE/TRUNCATE privileges for either `anon` or `authenticated`. Production Vercel configuration explicitly sets `STOREFRONT_PAYMENTS_MODE=off` and binds live platform `acct_1UEsMU2kQ2CrOdug` (US; charges and payouts enabled). The existing live key and the dedicated storefront signing secret are stored as sensitive production environment variables. Webhook `we_1UMrsc2kQ2CrOdugzj8lJIxI` targets `https://anystride.com/api/stripe/storefront-webhook`, uses API version `2026-08-26.dahlia`, and is disabled pending launch. The pre-existing live webhook is unchanged. Commission selection and deployment remain pending; sales are not enabled.

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
- Accounts v2 created a new Express test account and a hosted onboarding link. Fictional identity and test bank details were accepted; its final agreement step awaits operator confirmation. Checkout testing used a pre-existing, ready sandbox connected account.

Sandbox payment reference: `pi_3UMrQn2jFbP5Yg4b1qYtAqPw` on sandbox platform `acct_1UEsMa2jFbP5Yg4b`. The 10% fee was a test value and a launch recommendation, not a confirmed production commission.

Before live activation, finish the new-coach onboarding flow, confirm return-to-offer sign-in in the target environment, deploy the Accounts v2 update, select the commission, and settle the platform's payout/refund operation, tax handling and applicable seller/buyer terms. Credentials and the dedicated webhook are provisioned; set the chosen fee and live mode for the deployment, then enable the webhook and verify delivery. The sandbox exercise did not test a bank payout or replace a complete hosted-app authentication test.
