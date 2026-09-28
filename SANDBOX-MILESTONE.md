# Coaching purchase milestone: isolated sandbox

## Implemented sandbox functionality

Release note (September 13, 2026): the application code is now included in
production deployment `dpl_8Kv2MKPejFwMe9vCa6eUCjdFmdVL`, but the sandbox remains
hard-disabled there. No test tables, fixtures or local credentials were moved to
production. See `DEPLOYMENT.md` for verification and rollback details.

The account pilot can now connect an independently approved service and accepted
runner enquiry to the existing Stripe test checkout engine. The runner opens
checkout from their account; neither they nor the coach can supply price, fee,
destination, email, participant IDs or a replacement booking ID. The request UUID
is the stable payment-attempt ID. The private operator endpoint is unchanged.

An immutable participant/payment binding is committed before checkout creation.
The existing verified Stripe webhook updates the test booking. Only a matching
`paid` record permits that request's coach and runner into a private text workspace.
An administrator who is not a participant cannot read it. Pending, failed, expired,
review/disputed or refunded payments deny reads and writes. A withdrawn request or
suspended coach/service also denies access. Viewing the return page never grants it.

Messages are plain text (1–2,000 characters), limited to 100 per participant per
conversation each day. Exact retries are idempotent. Reads return the most recent
100 messages and no sender IDs. RLS denies browser database access. Message writes
lock the same payment record as the refund/dispute processor. No files, medical
data, email notifications for messages, scheduling or real-time delivery are added.

The feature defaults off and is hard-disabled when `VERCEL_ENV=production`. The
production payment key cannot enable it: existing payment configuration accepts
only a test key. Nothing in this implementation changes live payment settings.

## Setup required before the real browser test

1. Use a separate staging/local environment and isolated test databases. Do not
   seed or approve a synthetic coach in the production marketplace. Apply migration
   002 to the staging marketplace database, 001 then 004 to the isolated Stripe
   test database. Runtime handlers do not apply migrations.
2. Configure working Supabase email authentication for the staging origin and its
   exact `/account/callback`. The owner has supplied `matthias.e.link+coach@gmail.com`
   for the coach identity. Original owner email is the reviewer and runner. Do not
   grant reviewer privileges to the coach or bypass email verification. The current
   production pilot invitation list has not been changed by this implementation.
3. Configure the existing sandbox payment variables from STRIPE.md, matching the
   sandbox platform `acct_1UEsMa2jFbP5Yg4b`, its test key, connected test account and
   endpoint-specific test webhook secret. Keep these out of Production. Payment and
   marketplace origins must match. Do not reuse the live event inbox or its secret.
4. Create the synthetic application through the coach's authenticated form, approve
   it as reviewer, create a clearly labelled package and approve that service.
   Bind its exact service UUID and coach user ID to an operator-approved test offer
   via `STRIPE_TEST_SERVICE_BINDINGS`. The offer title, amount and currency must
   exactly match the service snapshot. Test fees are explicit configuration, not
   a decision about the live business model. Set `MARKETPLACE_SANDBOX_WORKSPACES=on`.
5. Submit a request as the runner, accept it as coach, open test checkout, and use
   a Stripe test payment method. Confirm a genuine Stripe delivery changes the
   booking to `paid`, then verify both users can exchange a synthetic message.
6. Verify an unrelated account cannot read/post; replay the checkout/message/event;
   then exercise declines, 3DS, expiry, refund and dispute test events. Confirm
   refund/dispute blocks access and cannot be undone by stale payment events.

The binding of a coach identity to a connected test account is explicitly
operator-reviewed in this sandbox, not self-service Connect onboarding. The
marketplace and payment databases are separate: a coach suspension/withdrawal
concurrent with an in-flight checkout is not atomically coordinated across them.
It blocks subsequent workspace requests, but a completed test payment may require
operator reconciliation. A live release must solve that coordination, durable
access/audit lifecycle, service duration, cancellation/retention, payment terms,
fees, taxes, notifications and support before any real money is accepted.

## Verification boundaries

Local-only follow-up: real local Supabase email authentication and the browser
flow through independent coach/package approval and accepted runner enquiry now
pass. See `LOCAL-TESTING.md` for setup, database evidence and exact boundaries.
Provider-backed Stripe checkout and browser messaging remain untested.

All 72 automated tests pass, along with lint, type checking and the Next.js
production build. The Next.js/React skill checks kept request authorization on
the server, private account routes free of analytics and client form retries
bound to stable references. The new browser UI has not yet been exercised with
real Supabase sessions and a real Stripe sandbox checkout.

New tests execute actual migrations, marketplace approval, checkout persistence,
payment-state validation, workspace queries and refund lockout in disposable
PGlite databases. Stripe network and Supabase identities are fixtures, not real
provider sessions. Concurrent hosted-Postgres behavior and the provider-backed
browser journey remain pending. This is implementation progress, not a claim
that the complete real milestone has been tested or that live selling is ready.

No hosted staging resource, external account or live charge was created. Local
verification applies migrations only to isolated local test databases and creates
two locally verified test identities. The application was subsequently deployed
as noted above; no Git commit or Git push was made.
