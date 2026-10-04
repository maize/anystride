This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Imported coach reviews

Before deploying the imported-coach review UI, apply `db/migrations/005_imported_coach_reviews.sql` to the database selected by `MARKETPLACE_DATABASE_SOURCE` (after migration 002). It is additive and safe to re-run. Do not apply it to the separate payments database.

Administrators can use `/account/review/imported` to correct source-backed details, publish, save a non-public draft, or hide a listing. Access uses the existing `MARKETPLACE_ADMIN_USER_IDS` allowlist. Editorial publication never creates an account, verifies ownership, or approves paid services.

The frozen 79 previously published V.O2 imports remain live until reviewed; new imports require explicit publication. Saved corrections take precedence over regenerated data. If the marketplace is disabled or review storage cannot be read, imported profiles are withheld rather than reviving hidden listings. The original curated directory remains available. Deploying without migration 005 therefore removes imported profiles from public pages until storage is ready.

Local testing: `node scripts/local-marketplace.mjs setup` applies the schema only to the guarded local marketplace database; `node scripts/local-marketplace.mjs dev` starts the isolated pilot on port 3010. Test draft/publish/hide in the browser and confirm the directory, direct profile, city page, and sitemap agree. No production decisions are copied from local testing.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
