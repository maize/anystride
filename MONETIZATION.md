# Monetization pilot

## Product boundary

Stripe work is documented separately in [the private test integration](./STRIPE.md).
It is disabled by default and not connected to the public enquiry forms.

Keep existing training plans, local progress, print and calendar exports free.
Preserve the minimal design. Do not sell verification badges or editorial rankings.
This release collects enquiries; it does not charge anyone, guarantee matches,
activate affiliate tracking, send email, or launch paid campaigns.

## Implemented locally

- `/coaching/match`: free request for a conversation about the manual matching pilot.
  Collects name, email, goal, format, optional city and contact permission.
- `/partners`: partnership enquiry for coaches, race organisers and brands.
  No fabricated audience statistics, prices or partner logos.
- `/clinics`: early interest from runners and potential athlete hosts. Three
  proposed topics, explicit unconfirmed availability, no booking or checkout.
- `/partners/race-hubs`: organiser-facing outline for a manually maintained
  preparation page, with a dedicated enquiry form. This is not a hub builder or
  an existing partner event. No automated emails or registration system is implied.
- Links from the plan-finder result, coaching directory and footer; existing
  outbound coach links continue to work and now have content-only click tracking.
- `/api/enquiries`: validated same-origin JSON POST, 8 KB body limit, honeypot,
  durable UUID retry deduplication, and Postgres limits of 3 requests/email/hour
  and 100 total/hour. These are pilot safeguards, not comprehensive bot protection.
- Success means the request was saved. Missing/unavailable storage returns an
  error with an email alternative; personal details are never logged as a fallback.
- Bearer-protected GET exports the newest 100 enquiries, with no-store headers.
  Uses existing `ADMIN_EXPORT_TOKEN`; query-string tokens are not accepted.

## Storage and operation

Uses the existing `POSTGRES_URL` / `DATABASE_URL` configuration and shared `pg`
pool. The `commercial_enquiries` table and its created-time index are created on
first use. This is a new table; existing coach applications and interest records
are unchanged. A deployment role needs CREATE privileges, or an operator must
provision the schema from `src/lib/enquiry-store.ts` first.

Before public launch:

1. Verify inserts, retry deduplication and authenticated export against an isolated
   staging database. Do not insert test leads into the production database.
2. Assign someone to review the export daily. No email notification or admin UI is
   included; requests will otherwise sit in the inbox unnoticed. A sample request:
   `GET /api/enquiries` with `Authorization: Bearer <ADMIN_EXPORT_TOKEN>` from a
   trusted administrative client, never in a public page or URL.
3. Respond from hello@anystride.com. Confirm each runner’s request and obtain
   permission for the specific introduction before forwarding contact details.
   A saved form is not a qualified or billable lead.
4. Keep exported contact data private. Establish and implement retention/deletion
   procedures before scaling; honour removal requests. This implementation does
   not automatically delete records or subscribe anyone to marketing.
5. Review existing database transport settings and dependency security alerts as
   separate pre-launch checks. No claim of security certification is made here.

The inbox currently returns the latest 100 records, not a complete paginated CRM.
Add status, follow-up notes, pagination, retention and alerting before higher volume.

## First commercial experiments (not active offers)

### Coach referrals first

Recruit five coaches manually and confirm focus, capacity and geography. Agree
what counts as an accepted introduction, what is excluded, and how duplicate,
unreachable or unsuitable enquiries are handled. Start with a free validation
period; test a subscription or per-introduction fee only after useful matches.
Previously discussed $29–49/month is a hypothesis, not published pricing.

### Race registrations next

Investigate RunSignup's event-directory affiliate programme. It combines event
API access with registration attribution; published terms describe 15% of the
processing fee, not the race entry fee. Account setup, current programme terms,
API credentials and disclosure need review before implementation. No affiliate
token has been invented or added, and no account was created.

Start with a narrow geography and separate races to enter from races to watch.
Use an approved API source in the discovery pipeline; retain provenance.

### Sponsorship after audience evidence

Pilot one labelled race promotion or sponsor-supported original athlete story.
Agree scope, placement, duration, reporting and editorial independence in advance.
Do not promise impressions or registrations without evidence, or monetise copied
articles and unlicensed images. Payments and invoices are a separate next step.

## Measurement

The weekly GA report includes `coach_match_open`, `coach_match_request`,
`coach_contact_click` and `partnership_enquiry`. Requests count only after a new
record was acknowledged by the server; duplicate retries do not emit a second
success event. Localhost, preview deployments and DNT/GPC remain excluded.
Form contents never go to analytics. A coach click can include its public slug.

The second pilot adds `clinic_interest` and `race_hub_enquiry`. These replace the
generic `partnership_enquiry` event for their respective submissions; do not add
them again as generic enquiries. Both attendee and host clinic requests count as
`clinic_interest`; distinguish them in the private export, not by sending their
form answers to GA. Page views provide the initial traffic baseline.

Review raw enquiries, confirmed valid requests, coach acceptances, introductions
and eventual paid outcomes separately. GA counts are not revenue, unique leads,
or a retention cohort. No revenue forecast is justified without baseline traffic.

References checked during the monetization discussion:
[RunSignup affiliate programme](https://runsignup.com/Affiliate),
[affiliate API and attribution documentation](https://runsignup.com/Affiliate/Doc).

## Athlete clinics and race hub validation

These are the next two experiments, not six simultaneous product launches.
Keep editorial coverage independent and existing resources free.

### Private inbox routing

All three interests use the existing `kind: partnership` storage category:

| `details.interest` | Required extra fields | Review action |
| --- | --- | --- |
| `clinic_attend` | `topic`; message optional, no organisation required | Group interest by topic; respond about this pilot only. |
| `clinic_host` | `organisation` (athlete name accepted), `topic`; message optional | Check relevant experience, teaching fit and availability. |
| `race_hub` | `organisation`, `message` | Confirm organiser authority, event details and requested scope. |

Topic keys are `race_preparation`, `training` and `strength`. New types are
allowlisted details on partnership records, so no change to the existing table's
kind constraint is needed. Existing coach/race/brand enquiries remain supported.
Do not forward attendee details to athletes or other participants without asking.

### First clinic: manual validation before booking infrastructure

1. Review topic interest and recruit one suitable athlete. For strength teaching,
   confirm relevant qualifications rather than treating race results as credentials.
2. Agree learning outcomes, format, availability, compensation and content rights
   with the athlete. Do not promise recording access before it is agreed.
3. Send interested runners a concrete proposed session and price for feedback.
   Interest submissions alone do not demonstrate willingness to pay.
4. Only after confirming the host and enough paying demand to cover delivery costs,
   approve booking, payment, cancellation and support arrangements. None is built
   or activated in this release. Decide whether to run, change or drop the pilot.

### First race hub: scoped service before a platform

1. Speak with one organiser about recurring preparation questions from entrants.
2. Propose one event page on Anystride: approved branding, date and distance,
   links to existing free plans/guides, official registration link, and reviewed
   FAQs. No participant imports, custom domains, dashboards or reminder automation.
3. Agree a setup fee, maintenance period, update owner, revision limits and approval
   process before commissioning. Price from the actual delivery scope; no public
   package price or revenue forecast is claimed yet.
4. Build the first actual hub only with approved event information and branding.
   Label the organiser relationship and record a visible content review date.
5. Track delivery hours, revisions, organiser feedback and willingness to renew.
   An enquiry is neither a sold hub nor guaranteed registration revenue.

Before public launch, complete the storage and inbox checks above. No outreach has
been sent, host recruited, organiser contacted, price agreed or payment collected.

## Verification on 2026-09-12

- 16 automated tests, lint and a production build (including TypeScript) passed.
- Browser checks confirmed both pages render, empty submission focuses the first
  required field, and choosing in-person coaching makes the city field required.
- API tests cover malformed input, permission, cross-origin requests, missing
  storage, persistence errors, private-export authentication and non-cacheability.
- Store tests exercise transaction boundaries, duplicate/conflicting request IDs,
  email/global limits and connection release using a mocked Postgres client.
- Added parser and API tests cover attendees, hosts and race hubs, topic allowlists,
  required business fields, storage-unavailable responses and duplicate retries.
- Browser checks cover both new pages, required-field focus, host/attendee field
  switching, expandable FAQ answers and the preselected race hub form. Desktop
  screenshots were inspected. Analytics classify pilot success without form data.
- No real lead was submitted and no external email, affiliate signup, payment or
  database migration was performed. Successful real-database round trips, mobile
  browser checks and operator inbox handling remain pre-launch acceptance checks.
