# Local coaching verification

This environment is separate from both hosted Supabase projects. No Vercel
deployment, paid subscription, real email delivery or real charge is required.
The local runner keeps Stripe checkout and reviewer emails OFF by default. Stripe
can be enabled only with the explicit test-only opt-in described below.

## Start

Installed for this test: Colima 0.10.3, Docker CLI 29.8.0, Supabase CLI 2.117.0
and Lima 2.2.0. The dedicated `anystride` VM uses 2 CPUs and 4 GiB memory.
It is not registered to start automatically at login, and does not switch the
default Docker context.

From the repository:

```sh
colima start anystride --activate=false --cpus 2 --memory 4 --disk 20 --root-disk 10 --mount /Users/matthias/anystride:w --ssh-config=false
```

The `anystride-local-only` network already exists. On a fresh machine create it
once; do not recreate an existing network:

```sh
docker --context colima-anystride network create --driver bridge --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 anystride-local-only
```

Always select that network when starting Supabase. The default exposes published
ports to the LAN; this network restricts them to loopback. This follows Docker's
[host binding guidance](https://docs.docker.com/engine/network/port-publishing/).
The reduced stack follows the [Supabase local workflow](https://supabase.com/docs/guides/local-development/cli/getting-started).

```sh
DOCKER_HOST=unix:///Users/matthias/.colima/anystride/docker.sock supabase start --network-id anystride-local-only --exclude realtime,storage-api,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
node scripts/local-marketplace.mjs setup
node scripts/local-marketplace.mjs dev
```

Supabase CLI output includes local credentials: do not paste its complete status
output into logs or chats. The helper consumes status in memory and never prints
keys. It refuses hosted endpoints and a linked Supabase project. It blanks keys
from the repository's normal environment files before starting Next.js, then
injects only the local configuration. Existing `.env.local` is not modified.

- Application: http://localhost:3010/account
- Captured email inbox: http://127.0.0.1:54324
- Auth/API: http://127.0.0.1:54321
- PostgreSQL: 127.0.0.1:54322
- Separate databases: `anystride_marketplace_test`, `anystride_payments_test`

Only the two supplied test emails are invited by default. A disposable local-only
address can be added for a fresh signup run without changing hosted configuration:

```sh
LOCAL_MARKETPLACE_TEST_EMAILS=browser-signup-test@local.invalid node scripts/local-marketplace.mjs dev
```

Sign up with the normal form,
then open the confirmation link from the local inbox in the same browser. Email
confirmation is enabled; no users are inserted or pre-confirmed directly in SQL.
The reviewer (`matthias.e.link@gmail.com`) must sign in once, then restart the dev
runner so its verified local user ID can be placed in the server-only admin list.
The coach alias does not receive administrator rights. These are local accounts,
not the production identities.

## Verified September 28, 2026

Through the in-app browser, real local Supabase Auth and PostgreSQL:

| Boundary | Result |
| --- | --- |
| Reviewer signup, email confirmation, callback, account rendering | Passed |
| Separate coach signup and email confirmation | Passed |
| Coach submits an application; no review queue on coach account | Passed |
| Reviewer independently approves coach | Passed |
| Coach proposes a $50 / four-week synthetic package | Passed |
| Reviewer independently approves package | Passed |
| Runner submits enquiry and sees saved state | Passed |
| Coach sees incoming enquiry and accepts it | Passed |
| SQL persistence and distinct runner/coach IDs | Passed |
| Real Stripe-hosted test checkout | Passed with Stripe's standard test card |
| Signed local webhook delivery and canonical payment verification | Passed |
| Paid workspace in browser, runner and coach messaging | Passed |

The separate payment database contains the provider-backed synthetic booking,
verified payment status and test workspace messages. No real charge or real paid
access was created. Synthetic records remain available for the next test;
production is untouched.

All automated tests passed. Those tests cover checkout, payment validation,
workspace authorization, retries and refund lockout using PGlite and simulated
Stripe responses. The September 28 browser run additionally proves provider-backed
checkout, signed webhook delivery and browser messaging. Lint and the production
build passed after adding the local runner.

## Stripe sandbox opt-in

Keep the default runner for normal marketplace work. For a payment verification
run, start a Stripe CLI listener for the eight events listed in `STRIPE.md`, then
set `LOCAL_MARKETPLACE_STRIPE_SANDBOX=on` together with a test secret key, test
platform account ID, listener signing secret, approved test offers and service
bindings. The helper rejects live keys and incomplete settings, keeps all values
in process memory, and never imports payment credentials from `.env.local`.

## Stop safely

Stop the dev runner with Ctrl-C in its terminal. Stop only this Supabase project,
preserving the test data:

```sh
DOCKER_HOST=unix:///Users/matthias/.colima/anystride/docker.sock supabase stop --project-id anystride-local
colima stop anystride
```

Do not use `--all`, `--no-backup`, `db reset`, or link this local project to a
hosted one. Stop the Stripe CLI listener with the same terminal session that
started it. The runner intentionally does not load payment credentials from
`.env.local`.
