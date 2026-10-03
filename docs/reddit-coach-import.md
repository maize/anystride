# Reddit coach discovery

This integration uses Reddit's approved OAuth Data API. It is not an HTML scraper, and it must stay disabled until Reddit has approved Anystride's complete use case in writing.

The scheduled job looks only in a small allowlist of running communities for a coach who explicitly advertises their own first-party coaching website. It uses that website to build an unclaimed listing, then rechecks the Reddit association every day. Public profiles describe the coach's services directly; they do not show Reddit attribution, post links, usernames, or how the listing was discovered.

## Approval required before activation

Reddit's current policies require explicit approval before API access, explicit written approval for commercial use, and a contract for commercial products. The Responsible Builder Policy also says developers must never re-identify or de-anonymize Redditors, including by matching Reddit data with off-platform identifiers. Because this workflow follows a self-supplied business URL and temporarily associates it with a post fullname, do not assume it falls outside that restriction: obtain Reddit's specific written confirmation that this exact handling is permitted. A generic API credential is not enough.

Obtain written authorization that explicitly covers all five scopes below:

1. Data API access for the registered Anystride app and its bounded subreddit searches.
2. Anystride's business or commercial use of the results.
3. Following a coach-supplied first-party website and retaining the association with the source post (off-platform linking).
4. Creating an unclaimed public directory listing from facts independently available on that website, without displaying Reddit content or provenance.
5. The daily revalidation, 36-hour fail-closed visibility window, hard-deletion process, and minimal source retention described here.

Record both Reddit's written approval reference and the Anystride reviewer who confirmed that every scope is covered. If the approval is ambiguous about any scope, leave the integration off and ask Reddit to clarify it.

Official references, which must be reviewed again before activation because Reddit may change them:

- [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy)
- [Developer Platform and Data API access](https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data)
- [Data API Terms](https://redditinc.com/policies/data-api-terms)
- [Developer Terms](https://redditinc.com/policies/developer-terms)
- [Data API authentication, limits, and deletion guidance](https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki)
- [App registration and migration](https://developers.reddit.com/app-registration)
- [Commercial/API access request](https://support.reddithelp.com/hc/en-us/requests/new?tf_42139884615700=api_request_type_enterprise_clone&ticket_form_id=14868593862164)

## Private-state and deletion design

Reddit discovery state lives in a dedicated private Postgres database, not in generated repository files.

- From a qualifying post, the database keeps only the post fullname needed for revalidation, the business website URL supplied in that post, and internal confirmation timestamps. It does not store usernames, post titles or bodies, comments, permalinks, subreddit profiles, or inferred identities.
- The business website URL comes directly from the Reddit post; review state and proposed profile facts come from that first-party site. Four successful checks on distinct UTC dates are required before a new record can be published.
- On every daily run, each retained fullname is looked up again through Reddit's API. A returned post that is deleted, removed, or no longer explicitly says that the coach offers active coaching at that exact first-party site is hard-deleted in the final database transaction. A fullname merely omitted from an otherwise successful bulk API response is treated as ambiguous: its confirmation is not refreshed, it is marked missing, and it is retained until another successful omission at least 24 hours later. This prevents one partial response from mass-deleting records while still guaranteeing eventual deletion. A candidate with no remaining source association is hard-deleted too.
- If Reddit revalidation fails, the run aborts before writing confirmations or deletions. The public view then fails closed: it exposes only published records with a successful source confirmation in the last 36 hours.
- Review candidates are retained for at most 30 days and known duplicates for at most 7 days. The importer keeps at most 250 active Reddit candidates and three source fullnames per candidate; excess non-public state is deleted before revalidation. Published candidates are never removed merely to make room. If published records alone exceed the cap, the run stops for manual review instead of silently deleting them. These limits bound daily Reddit lookups and website checks.
- The application reads only the sanitized `public.reddit_coach_directory` view. That view returns public coach JSON, never source fullnames or private review state.
- Public listings contain only website-derived coach details. They do not expose Reddit provenance.
- The private `suppressed_domains` table contains only normalized domain keys. A suppression takes effect immediately in the public view, excludes matching candidates and source associations before the next import revalidates or assesses them, and prevents rediscovery from adding the same site again. A key matches that hostname and its subdomains. Suppressions are operator-managed and are deliberately preserved by the discovery-data purge.

The importer creates or updates its private schema, tables, indexes, and sanitized view idempotently during a normal run. It applies discovery, revalidation, promotion, and deletion changes together so a partial run cannot leave mixed state.

## Suppressing a coach site

Use the private importer database credential in a trusted SQL console. Store only the normalized lowercase domain, without a scheme, path, port, trailing dot, or `www.` prefix. Do not put a coach name, email address, request text, or reason in this table. For example, `example-coaching.com` also suppresses `www.example-coaching.com` and `shop.example-coaching.com`.

Add a suppression:

```sql
INSERT INTO reddit_import_private.suppressed_domains (domain_key)
VALUES ('example-coaching.com')
ON CONFLICT (domain_key) DO NOTHING;
```

List suppressions:

```sql
SELECT domain_key
FROM reddit_import_private.suppressed_domains
ORDER BY domain_key;
```

Remove a suppression only after an operator has approved relisting that site:

```sql
DELETE FROM reddit_import_private.suppressed_domains
WHERE domain_key = 'example-coaching.com';
```

Adding a key hides a matching published profile through the sanitized view immediately. The next successful import hard-deletes matching candidate and source rows before doing Reddit revalidation or website assessment. Removing a key permits future discovery; it does not restore deleted state automatically. The `--purge` command below deletes discovery candidates and source associations but never deletes suppression keys.

## Database setup

Use one dedicated database with two separate credentials:

1. Give the scheduled importer a writer/admin connection URL as the GitHub Actions secret `REDDIT_IMPORT_DATABASE_URL`.
2. Create a separate read-only role for the website. Grant it only `USAGE` on the `public` schema and `SELECT` on `public.reddit_coach_directory`; do not grant access to the private import schema or its tables.
3. Set that read-only role's connection URL as `COACH_DISCOVERY_DATABASE_URL` in the deployed Anystride application. If the provider uses a private CA, set its single PEM certificate as `COACH_DISCOVERY_DATABASE_CA`. Do not reuse the importer credential.

The sanitized view exists after the first approved normal importer run. If the read role is provisioned earlier, apply its view grant after that first run.

The relevant grants are:

```sql
GRANT USAGE ON SCHEMA public TO anystride_coach_directory_reader;
GRANT SELECT ON public.reddit_coach_directory TO anystride_coach_directory_reader;
```

Role creation and credential rotation are provider-specific. Confirm that the read role has no inherited membership or broad database grants. Both connections require certificate verification for remote hosts and ignore weaker TLS options embedded in a connection URL. Use `REDDIT_IMPORT_DATABASE_CA` and `COACH_DISCOVERY_DATABASE_CA` only when the provider requires a private CA. Localhost connections use no TLS for local testing. The application has no fallback to another database URL: if this URL is missing, invalid, unavailable, or the view contains stale data, Reddit-discovered entries are omitted while the static directory remains available.

## GitHub Actions configuration

Create all five repository variables below only after the recorded written approval explicitly covers the corresponding scope:

- `REDDIT_APPROVAL_DATA_API=true`
- `REDDIT_APPROVAL_COMMERCIAL_USE=true`
- `REDDIT_APPROVAL_OFF_PLATFORM_LINKING=true`
- `REDDIT_APPROVAL_PUBLIC_DIRECTORY=true`
- `REDDIT_APPROVAL_DELETION_PROCESS=true`

The job runs only when every value is exactly `true`. The legacy `REDDIT_DATA_API_APPROVED` variable does not enable anything.

Create these GitHub Actions secrets:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_USER_AGENT`, in Reddit's `platform:app-id:version (by /u/account)` format
- `REDDIT_IMPORT_DATABASE_URL`, using the private database writer credential
- `REDDIT_IMPORT_DATABASE_CA`, only if the database requires a private CA certificate
- `REDDIT_APPROVAL_REFERENCE`, identifying Reddit's written authorization
- `REDDIT_APPROVAL_REVIEWER`, identifying the person who checked its scope

Optional repository variables can adjust the bounded batch guards: `REDDIT_IMPORT_MAX_CANDIDATES` defaults to 25 and cannot exceed 50; `REDDIT_IMPORT_MAX_ADDITIONS` defaults to 10 and cannot exceed 25.

The workflow runs daily and can also be started manually. It has read-only repository permissions, checks out without persisted credentials, and runs the tests, lint, typecheck, and production build before the importer is allowed to change the database. Reddit and database secrets are provided only to the importer step; dependency installation and verification receive none of them. The workflow never creates a branch, commit, generated artifact, or pull request.

To stop collection immediately, set any one of the five approval variables to `false` or remove it. For a policy or approval change, disable all five until the use case has been reviewed again.

## Purging all discovery state

First disable the scheduled job by removing or setting an approval variable to `false`. Then run the purge with the private writer URL supplied through a secure secret-injection method:

```sh
REDDIT_PURGE_APPROVED=true npm run import:reddit-coaches -- --purge
```

`REDDIT_IMPORT_DATABASE_URL` is also required in that command's environment. The purge does not call Reddit. It hard-deletes all rows from both private source and candidate tables in one transaction while retaining the empty schema, sanitized view, and operator-managed domain suppressions. The public view becomes empty immediately. Remove `COACH_DISCOVERY_DATABASE_URL` from the deployment too if the application should no longer connect to this database.

## Local verification

Tests use only synthetic posts and websites and require no credentials. A dry run still enforces the written-approval gates and uses the private database for existing review state, but does not persist its proposed changes:

```sh
npm run import:reddit-coaches -- --dry-run
```
