# Service deletion

Coaches can delete their own services from My services and the storefront editor.
The confirmation removes the service from active lists, public profiles and the
review queue. New enquiries, checkouts, edits and review decisions are rejected.
Deletion also frees one of the ten active service slots. A deleted service cannot
be restored; the coach can create a new service for a future offer.

The service row and its offer details stay in the database to preserve foreign
keys, enquiries, purchase snapshots, payment reconciliation and audit records.
Existing payment links can still complete, and existing buyers keep their original
purchase instructions. Deletion does not refund or cancel an existing purchase.

Apply `db/migrations/016_service_deletion.sql` explicitly to the selected
marketplace database **before deploying this code**. It adds a nullable
`deleted_at` column and an index for active services. It is safe to reapply.
The local marketplace setup includes it for new local databases; existing local
databases only need this migration. Production migration and deployment are
separate release actions; neither is performed by an ordinary app build.

## Production application

Migration 016 was applied and verified on October 19, 2026 (New York) in the
Anystride production Supabase project `gwwsxrtmlcnisnbphrfq`. The guarded operator
`scripts/migrate-service-deletion.mjs` ran in staged Vercel deployment
`dpl_A9Qwig5nFSuY5nTX32kLAyuBjjDs`, with automatic domain assignment disabled.
The build log confirmed the nullable timestamp column and a valid active-service
index. No service or purchase records were changed. The ordinary build command
is unchanged; the operator requires explicit `ANYSTRIDE_SERVICE_MIGRATION=apply-016`
and validates the production origin, Supabase project and database source.
