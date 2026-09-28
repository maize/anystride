# Stripe Connect: test checkout and live event inbox

## Current scope

Checkout remains an **operator-only test harness**, not a public coaching marketplace.
The independent live event inbox is enabled in Production for recording only.
Live keys and live payment events are rejected by the test checkout harness. Payment creation is disabled unless
`STRIPE_PAYMENTS_MODE=test` and all required settings exist.

On 2026-09-12, the owner approved creating a separate **Anystride** Stripe account
with **United States** as its country of operation. Creation was verified at
`acct_1UEsMU2kQ2CrOdug` in test mode. The account is separate from buntekultur;
existing accounts were not reconfigured. Setup preferences were completed for
online payments and a marketplace, without enabling invoices or tax products.
Stripe created **Anystride sandbox** (`acct_1UEsMa2jFbP5Yg4b`) and a synthetic
**Test connected account** (`acct_1UEsfW2jFbKVckDg`). The latter shows United States,
payments active and payouts active. Stripe also seeded an example $100 test payment;
this did not go through Anystride's checkout or webhook and is not an integration
test result. No real payment or live activation occurred. Use the **sandbox**
platform ID with its matching test key, not the parent account ID above.
Test secrets, webhook delivery and the isolated payment database still need configuration.

On 2026-09-13, the owner completed live verification and approved the marketplace
destination-payment model. A restricted live key named **Anystride production
checkout** was saved as a secret `STRIPE_SECRET_KEY` in Vercel **Production only**.
It has Checkout Sessions write and Charges/Refunds, Payment Intents and Connect
Accounts read permissions; no payout or standalone transfer management. The key
was not saved locally. Saving it does not enable the test-only checkout code.

### Production event recording verified on 2026-09-13

The owner approved the database migration, webhook registration and signing-secret
storage. Migration 003 was applied to the existing Anystride Supabase project
`gwwsxrtmlcnisnbphrfq`. SQL inspection confirmed RLS enabled and zero browser
policies. No marketplace or isolated test-payment migrations were applied.

Stripe destination **Anystride live event inbox** (`we_1UFHlG2kQ2CrOdugrfHIxfbe`)
is Active on the live platform, using **Your account**, Snapshot payloads, API
version `2026-08-26.dahlia` and the eight specified event types. Its URL is
`https://anystride.com/api/stripe/live-webhook`. The signing secret was transferred
directly to Sensitive `STRIPE_LIVE_WEBHOOK_SECRET` in Vercel Production, not saved
to disk or emitted in logs/chat. The transient signing-secret binding was cleared.

The initial deployed diagnostic exposed `SELF_SIGNED_CERT_IN_CHAIN`. The inbox now
uses Supabase's dashboard-provided Root 2021 CA via `STRIPE_EVENT_DATABASE_CA`,
scoped only to this pool, with `rejectUnauthorized: true`. The certificate's
SHA-256 fingerprint is
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`.
It expires 2031-04-26. Runtime failures log only allowlisted diagnostic codes,
never driver messages, credentials or payment payloads.

Deployed and promoted `dpl_FgBNBhjPQxD9rAsCkYL98dBaBXUi` to `https://anystride.com`
(no git commit/push). All 55 tests, lint, type checking and production build passed.
Production uses `STRIPE_EVENT_DATABASE_SOURCE=POSTGRES_URL`, the explicit live
account ID and `STRIPE_WEBHOOK_MODE=live-inbox`; checkout and marketplace stay off.

A clearly labelled synthetic event, signed locally with the endpoint secret,
returned 200 and persisted one `received` row. Replays through both the staged
deployment and public domain returned `duplicate: true`. SQL confirmed the record,
then exact-ID cleanup removed the single diagnostic row. Invalid signatures return
400; public checkout still returns its disabled operator guard (404). No Stripe
charge, refund, transfer or paid-access change was created by these checks.
This proves the deployed signature → database → acknowledgement path, **not a
Stripe-origin delivery or customer payment**. Stripe delivery history was empty;
verify its first genuine delivery separately without creating a charge just to test.

Prior disabled production deployment for rollback:
`https://anystride-uwq6qkvta-matthias-links-projects.vercel.app`.

Implemented:

- Official Stripe Node SDK, pinned in the lockfile.
- Server-approved one-off test offers and Stripe-hosted card checkout.
- Connect destination payments with an explicitly configured application fee.
- Connected-account readiness and platform-account identity checks. The current
  test scenario requires the coach and platform to be in the same country.
- Durable booking attempts, Stripe idempotency keys and row-locked session creation.
- Raw-body webhook signature verification; matching amount, currency, fee,
  destination, booking and session checks before a record becomes `paid`.
- Canonical Stripe state read inside a booking transaction, event deduplication,
  and conservative `review` / `refunded` states for disputes and refunds.
- Private operator status endpoints. No personal information is sent to analytics.

The separate [account/enquiry pilot](./MARKETPLACE.md) now implements managed sign-in,
coach/service approval and owned requests. The marketplace database migration,
single-owner closed pilot and provider-backed login/dashboard reads are verified
in [MARKETPLACE.md](./MARKETPLACE.md). Separate-role application and enquiry writes
remain unverified. The owner-approved reviewer account is now active; checkout
remains disabled and separate from that role.
It is not connected to this private test checkout. Not implemented: account claiming,
self-service Connect onboarding, coach service editing, public checkout, messaging, appointments,
customer notifications, subscription billing, refunds initiated by Anystride,
automatic coach access, or an operator reconciliation UI. Do not remove the
operator guard to turn this into a public checkout endpoint.

## Live event inbox (not payment fulfilment)

`POST /api/stripe/live-webhook` is a separate, default-off receiver. It verifies
Stripe's raw-body signature and timestamp with the endpoint-specific signing
secret, rejects test/connected-account/organisation events, and persists a minimal
reference before acknowledging. It does not call Stripe's API or require the live
API key. It cannot change a booking, charge a card or grant coach access.

Explicit setup order:

1. Review and apply `db/migrations/003_stripe_live_event_inbox.sql` to the selected
   Anystride production database. This adds one table/index with RLS and no
   browser policies. Runtime code never applies migrations.
2. Set `STRIPE_EVENT_DATABASE_SOURCE=POSTGRES_URL` to explicitly use the existing
   Anystride database, or `STRIPE_EVENT_DATABASE_SOURCE=STRIPE_EVENT_DATABASE_URL`
   plus a separate secret connection string. There is no implicit fallback to the
   test database. Remote TLS always verifies certificates. If the provider needs
   its own root CA, set `STRIPE_EVENT_DATABASE_CA` to the PEM obtained from its
   authenticated dashboard; it applies only to this connection. Never disable
   verification or trust a certificate obtained from a failed TLS handshake.
3. Deploy the receiver disabled, then register a live **Your account** snapshot
   destination on `acct_1UEsMU2kQ2CrOdug` at
   `https://anystride.com/api/stripe/live-webhook`. Subscribe only to the eight
   event types in the test listener command below (Checkout completion/failure/
   expiry, charge refund and dispute lifecycle).
4. Save its signing secret as `STRIPE_LIVE_WEBHOOK_SECRET` in Production only.
   Set `STRIPE_LIVE_PLATFORM_ACCOUNT_ID=acct_1UEsMU2kQ2CrOdug` and
   `STRIPE_WEBHOOK_MODE=live-inbox`, then redeploy. The configured account label is
   not an API identity check: correct account/endpoint registration and its unique
   signing secret establish origin. Keep `STRIPE_PAYMENTS_MODE=off`.
5. Verify Stripe delivery → HTTP 200 → one database row; resend the same event
   and verify no additional row. Do not create a real charge just to test this.
   Synthetic local signatures and in-memory SQL tests are not provider delivery.

The inbox stores account/event/object IDs, type, API version and timestamps only;
raw payloads, billing details, emails and metadata are discarded. All rows remain
`received` (unprocessed). Duplicates are deduplicated by account/event ID; ordering
cannot grant access because there is no fulfilment processor. Unsupported signed
event types return `ignored: true` without storage. Database failures return 503
for Stripe retry; invalid signatures return 400. No automatic retention job exists;
assign an operator and retention/reconciliation policy before accepting customers.

Nine additional tests cover real SDK signatures, stale/altered payloads, body
limits, mode and account boundaries, explicit configuration, verified TLS,
retryable database failures, minimal SQL persistence, duplicate delivery, RLS and
provider-CA validation without disabling certificate verification.

## Local setup

1. Sign in to the Stripe account intended for Anystride. Select its sandbox/test
   environment. Do not activate live payments or enter invented business details.
2. Enable the intended Connect test setup and prepare a **test connected account**.
   Confirm it belongs to this platform and has completed its test onboarding,
   charges and payouts enabled, and active transfers. Do not enrol directory
   coaches without their participation. Self-service onboarding needs authenticated
   coach ownership before Anystride can safely issue account links.
3. In an ignored local environment file, set the variables below. Never paste
   secret keys into chat, commit them, prefix them with `NEXT_PUBLIC_`, or put an
   administrative token into a browser URL. No publishable key is needed for this
   hosted-checkout backend.
4. Provision an isolated Postgres test database, use verified TLS for remote
   connections, and manually apply `db/migrations/001_test_payments.sql` there.
   Runtime code never applies DDL and never falls back to the production enquiries
   database. The migration only creates new test tables.
5. Restart local development to load the settings. Keep production settings off.

| Variable | Purpose |
| --- | --- |
| `STRIPE_PAYMENTS_MODE` | Exactly `test`; default is off. No live mode exists. |
| `STRIPE_SECRET_KEY` | Test secret from the selected platform sandbox. |
| `STRIPE_PLATFORM_ACCOUNT_ID` | Explicit account ID for that platform. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this test webhook listener. |
| `STRIPE_APP_URL` | Fixed origin, e.g. `http://localhost:3010`; HTTPS off localhost. |
| `PAYMENTS_ADMIN_TOKEN` | Separate random credential, at least 32 characters. |
| `PAYMENTS_DATABASE_URL` | Isolated test database, never the lead database. |
| `STRIPE_TEST_OFFERS` | Private JSON offer configuration, default `[]`. |

Test offer shape (replace the account placeholder with the real **test** connected
account ID). Amount and fee are integer minor currency units. These example amounts
are synthetic test data, not proposed public pricing or commission:

```json
[
  {
    "id": "sandbox-consultation",
    "title": "Sandbox consultation",
    "coachAccount": "<test connected account id>",
    "amount": 5000,
    "currency": "usd",
    "fee": 500,
    "approved": true
  }
]
```

Only USD, EUR and GBP are supported by this test harness; zero-decimal currencies
are not. A trusted operator supplies configuration. It is not a substitute for
coach approval, booking availability or a service contract in the future product.

## Endpoints and workflow

All endpoints except Stripe's webhook require `Authorization: Bearer <PAYMENTS_ADMIN_TOKEN>`.
Only use a trusted server-side administrative client; no token query parameters,
browser-local token storage, or shared admin credentials for coaches.

1. `GET /api/stripe/connect/status?offerId=sandbox-consultation` checks the offer's
   connected account against the platform. It does not create or onboard an account.
2. `POST /api/stripe/checkout` accepts **only** the following JSON. Use a fresh UUID
   for a new operator-approved test booking and retain it for every retry:

   ```json
   { "bookingId": "<UUID v4>", "offerId": "sandbox-consultation", "email": "runner@example.com" }
   ```

   The response contains the Stripe-hosted checkout URL and `testMode: true`.
   Requests cannot supply prices, payout accounts, commissions or redirect URLs.
   Use synthetic contact details and only Stripe test payment methods.
3. Stripe posts payment events to `POST /api/stripe/webhook`.
4. `GET /api/stripe/bookings` returns the latest 100 test payment records, omitting
   the stored test email and checkout parameters. The `paid` state is a verified
   payment record, **not an implemented client-access entitlement**.
5. `/coaching/payment-return` deliberately shows a neutral, non-indexed text page.
   It has no analytics, private session identifier or entitlement mutation. Visiting
   it does not prove payment and does not distinguish completed/cancelled checkout.

Use the Stripe CLI local listener after authenticating the correct sandbox:

```sh
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.refunded,charge.dispute.created,charge.dispute.updated,charge.dispute.closed --forward-to localhost:3010/api/stripe/webhook
```

Use the listener's signing secret locally. A deployed test webhook needs its own
endpoint secret and public HTTPS URL. Listen to **platform account** snapshot
events, not connected-account events. Match the event API version to the pinned
SDK's version; recheck it when upgrading Stripe. No webhook was registered here.

## Failure and reconciliation rules

- A durable attempt is created before calling Stripe. A timeout or DB attachment
  failure must be retried using the **same booking ID and details**. The stored
  checkout parameters and Stripe idempotency key are reused.
- Changing offer configuration, return origin or booking details under the same
  ID returns a conflict. Never automatically issue a replacement charge.
- An uncertain attempt without a saved session older than 23 hours refuses session
  creation, before Stripe's minimum 24-hour idempotency retention elapses. Inspect
  Stripe using the booking metadata and reconcile manually.
- Paid, failed, expired, refunded or held bookings cannot create a new checkout.
- Webhook persistence failures return non-2xx so Stripe can retry. Duplicate
  acknowledged events do not run the booking update twice.
- Any refund, including partial refunds, or any dispute places the booking in
  `review` or `refunded`. A later completed-payment event cannot restore it.
  Dispute resolution needs an explicit future reconciliation workflow.
- Destination-charge refunds may need transfer reversal and application-fee
  refunds as separate choices. This code **does not issue refunds or reverse
  transfers**; it only records incoming events. Do not interpret `review` as a
  completed financial correction.
- Assign an operator and decide retention/deletion for test emails and booking
  records. No cleanup or email notification job is included.

## Verification and launch gates

Automated tests cover configuration and live-key rejection, authorization, input
tampering, Connect readiness, signed/forged/expired webhook payloads, payment
matching, refund/dispute holds, durable retry recovery, conflicting/old attempts,
deduplication and transaction cleanup. Stripe signature verification uses the real
SDK with a synthetic signing secret; Stripe network responses are simulated.
An additional PGlite integration test applies the actual payment migration and
verifies SQL checkout persistence, payment/event deduplication, tamper rollback,
refund persistence and protection against stale events restoring refunded status.

Implementation checks: automated tests, lint and the production build passed on
2026-09-12. The return route now serves neutral, script-free HTML with a restrictive
content security policy; browser navigation works. Local HTTP checks confirm
disabled endpoints fail closed. These checks are not evidence of a completed
Anystride sandbox payment or a deployed database migration.

**Still required:** real sandbox checkout → signed webhook → isolated database →
operator status round trip; simultaneous retries against Postgres; expired sessions;
declines/3DS; refund and dispute test events; reconciliation and support ownership.
No Anystride-to-Stripe checkout round trip or hosted-database transaction has yet
been verified. Disposable in-memory SQL integration tests pass.

Before live use, activate and verify the account/approval pilot, then implement availability,
service terms, cancellation/refund handling, audited access grants/revocation and
operational monitoring. The dependency audit reports zero vulnerabilities after
upgrading Next.js and affected dependencies on 2026-09-12; rerun before deployment. Review the
platform's business/payment responsibilities and applicable requirements before
choosing a live charge model; destination charges currently place Stripe fees,
refunds and chargebacks on the platform. This test implementation is not approval
of that live business arrangement.

Primary references:
- [Stripe destination charges](https://docs.stripe.com/connect/destination-charges?platform=web&ui=stripe-hosted)
- [Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment?payment-ui=stripe-hosted)
- [Webhook signatures and local testing](https://docs.stripe.com/webhooks)
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests)
