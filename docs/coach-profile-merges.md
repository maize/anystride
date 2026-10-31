# Coach profile merges

Apply `db/migrations/017_coach_profile_merges.sql` to the marketplace database
before deploying. The additive migration is idempotent. Private contact emails
and account ownership links have RLS enabled and browser-role access revoked.

After email verification, the account overview and coach application page offer
matching imported profiles. Matching uses the exact trimmed, lowercased verified
account email. It does not infer identity from a name, website domain, Gmail dots
or plus aliases. Matching addresses come from an existing public mailto contact
or a private email an admin records in an imported profile editor. Admins must
check the original source or obtain the email from the coach; unknown addresses
stay unknown. Private matching emails never enter the public Coach model.

The coach explicitly confirms the merge. A new application stays pending and
still needs Anystride approval. Existing applications, services, orders and
storefronts are retained. Imported public details seed a private storefront draft
only if a profile does not already exist and its address is available. The old
profile and source data are retained. Repeated requests do not create duplicates;
a listing can belong to only one account, including across competing requests.

Once the account is approved, `/coaches` omits its linked imported listing and
shows the account once with its approval badge. The old imported URL redirects
to the coach’s storefront when it is published. Before then the original URL
remains available with the approval badge. Suspended coaches cannot reappear
through their merged imported listing. Pending applications do not remove the
existing directory entry or gain approval through a merge.

Jack Anstey’s existing static profile has a public mailto contact, so it can be
matched without adding a private registry entry. His account will receive the
merge prompt only if its verified email matches that contact. No account is automatically merged by name. Production migration and publication
are explicit release actions, separate from an ordinary build.

## Production rollout — October 19, 2026 (New York)

Migration 017 was applied and its private-table permissions verified in production.
The shared cards and merge-aware directory were promoted in deployment
`dpl_AsYWqgPtfaKMt3AFj3N7F1sYbGGo`, built from live commit `36edfdd` plus the
scoped profile merge and card changes. Unrelated local changes were excluded.

Jack Anstey’s approved account matched the imported public contact email, but
had not completed email confirmation. The initial guarded merge did not proceed.
Matthias explicitly approved an admin exception in this chat; the subsequent
operator recorded `coach-profile:admin-merge` and verified the existing account,
storefront, services, orders and enquiries were unchanged. Email verification was
not changed. The live `/coaches` page shows one Jack Anstey profile. Ordinary
self-service merges still require the verified account session.

## Duplicate card correction — October 31, 2026 (prepared locally)

The live domain is running GitHub main commit d42a682, whose directory still
renders approved applications separately from imported directory cards. A fresh
public HTTP response confirmed two Jack Anstey headings (113 total profiles).
The earlier merge-aware card changes were not present in that deployed source.

The prepared fix builds one card list using explicit account/directory links.
Linked approved accounts reuse the directory's concise card description,
location, initials, format and specialty tags, with the Approved badge. Full
application text remains available on the account/profile. Published storefronts
replace both entries. Linked coaches retain location, focus and format filters;
suspended linked profiles remain hidden. Names alone never merge accounts or
transfer approval. No production identity, service, order or payout data changed.

Validated the scoped 13-file release against the exact live source: all 29
relevant directory, identity-merge and marketplace tests passed, as did TypeScript,
targeted lint and the production Webpack build. A local render of the real
CoachCard component shows one Jack card with one approval badge and the requested
layout. Screenshot: .playwright-mcp/merged-jack-card.png (local only).

Production release remains pending. Automatic approval review rejected creating
a production Vercel deployment, including one with automatic domain promotion
disabled, because this request did not explicitly authorize a production release.
It also rejected exporting the full production environment; no such export was
performed. The scoped source is prepared at /private/tmp/anystride-jack-release/source
with no environment files copied. Publishing and verifying the existing production
linkage still require release authorization. No Git commit or push was made for
this follow-up.

## Directory fix published — October 31, 2026

Matthias explicitly authorized pushing and publishing the prepared fix. The scoped
release was built from live commit d42a682 with only the directory/merge changes.
Production candidate dpl_BphB18E63PGWMUjJJdg54aE74rn9 showed one Jack card against
the existing production data before promotion. No database migration or account
record mutation was needed: the existing ownership link was already present.

Promoted the candidate to anystride.com. Fresh public HTTP and browser checks
confirmed one Jack Anstey card with the directory's concise description, initials,
Global location, specialty tags and Approved badge. The Online/performance/online
filter combination also returns one Jack card. Existing account, service and
order records remain unchanged. The 29 relevant tests and production build passed.
