# Production release — September 13, 2026

## Deploy result

- URL: https://anystride.com
- Target: production
- Status: READY; promoted after release checks
- Deployment: `dpl_8Kv2MKPejFwMe9vCa6eUCjdFmdVL`
- Immutable URL: https://anystride-es03knicb-matthias-links-projects.vercel.app
- Source: working-tree snapshot based on `5de2d2a`; no Git commit or Git push
- Framework: Next.js 16.3.5
- Build duration: 18 seconds reported by Vercel

## Verification

- 72 automated tests passed, plus ESLint and whitespace checks.
- Vercel production compilation and TypeScript checks passed.
- Before promotion: homepage, coaching and sign-in returned HTTP 200.
- Before promotion: anonymous marketplace API returned 401/private/no-store;
  checkout returned 404 with payment administration disabled.
- After promotion: Vercel resolved `anystride.com` to the new deployment.
- Homepage, plans, coaching and sign-in returned HTTP 200 on the live domain.
- Preferred homepage headline remains present; no local test coach appeared.
- Existing signed-in account and empty reviewer queue rendered in the browser.
- Authenticated access to the sandbox workspace displayed “Sandbox coaching is
  not enabled.” No sandbox data query or paid access was enabled.

Local Supabase files, the local launcher and `.env*` files are excluded by
`.vercelignore`. No database migrations or provider configuration changes were
applied. Existing production email/authentication configuration is retained.
Real Stripe checkout, webhook fulfillment and paid messaging remain unverified
and disabled; this is not a live-payments launch.

## Post-deploy observability

- Error scan: Vercel returned no error-log entries for this deployment in the
  10-minute query window. This is a point-in-time check, not proof of no future errors.
- Drains: not inspected or changed in this release.
- Monitoring: release smoke checks completed; no recurring monitor added.

## Rollback target

Previous production deployment: `dpl_3cGonqYT7XvGTnT2dhvm83nDbNyE`

https://anystride-1afvd6fwu-matthias-links-projects.vercel.app

Rollback would require an explicit operator action; none was performed.
