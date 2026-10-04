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

Apply `db/migrations/006_coach_storefronts.sql` after `002_marketplace.sql` to the explicitly selected marketplace database. This is an additive migration with RLS and no browser access policies. Applying it is an operator action; deployment does not apply it automatically. No production migration or payment configuration was changed during implementation.

Storefront payments require the existing marketplace authentication configuration plus:

| Variable | Purpose |
| --- | --- |
| `STOREFRONT_PAYMENTS_MODE` | `off` by default; explicitly select `test` or `live` |
| `STOREFRONT_STRIPE_SECRET_KEY` | Platform key matching the selected mode |
| `STOREFRONT_STRIPE_PLATFORM_ACCOUNT_ID` | Expected platform account; verified against Stripe |
| `STOREFRONT_STRIPE_WEBHOOK_SECRET` | Signing secret for the storefront endpoint |
| `STOREFRONT_PLATFORM_FEE_BPS` | Commission in basis points, defaults to zero; range 0–5000 |

The first payment implementation uses Stripe-hosted Checkout and Express connected accounts in the same country as the platform. It checks current charge/payout capabilities before checkout. Amounts are fixed one-time totals in USD, EUR or GBP, currently limited to 1–1,000 currency units by the existing service model. No automatic tax calculation or subscription billing is implemented.

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

Actual Stripe-hosted onboarding, payment, refund and webhook delivery have **not** been exercised against a Stripe sandbox. Payments remain disabled locally. Before live activation, complete that sandbox flow with separate coach and buyer accounts, check failed-payment and interrupted-checkout paths, confirm return-to-offer sign-in in the target environment, and settle the platform’s commission, payout/refund operation, tax handling and applicable seller/buyer terms. These are launch dependencies, not behavior that the current UI claims is live.
