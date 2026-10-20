/** Explicit production release operator. Never called by the normal build. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client } from "pg";

assert.equal(process.env.ANYSTRIDE_SERVICE_MIGRATION, "apply-016", "Explicit service migration authorization required");
assert.equal(process.env.VERCEL_ENV, "production", "Production environment required");
assert.equal(process.env.MARKETPLACE_APP_URL, "https://anystride.com", "Unexpected application origin");
const project = "gwwsxrtmlcnisnbphrfq";
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, `${project}.supabase.co`, "Unexpected Supabase project");
const source = process.env.MARKETPLACE_DATABASE_SOURCE || "MARKETPLACE_DATABASE_URL";
assert.ok(["POSTGRES_URL", "MARKETPLACE_DATABASE_URL"].includes(source), "Unexpected database source");
const database = new URL(process.env[source]);
assert.ok(database.hostname === `db.${project}.supabase.co` ||
  (database.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(database.username) === `postgres.${project}`), "Unexpected production database");
for (const key of [...database.searchParams.keys()]) if (key.startsWith("ssl")) database.searchParams.delete(key);
const db = new Client({ connectionString: database.toString(), ssl: { rejectUnauthorized: true, ...(process.env.MARKETPLACE_DATABASE_CA ? { ca: process.env.MARKETPLACE_DATABASE_CA } : {}) }, connectionTimeoutMillis: 10000, statement_timeout: 30000, lock_timeout: 5000 });
try {
  await db.connect();
  const { rows: [schema] } = await db.query("SELECT to_regclass('public.marketplace_services') IS NOT NULL AS services");
  assert.ok(schema.services, "Marketplace service schema missing");
  await db.query(readFileSync(new URL("../db/migrations/016_service_deletion.sql", import.meta.url), "utf8"));
  const { rows: [column] } = await db.query("SELECT data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='marketplace_services' AND column_name='deleted_at'");
  assert.equal(column?.data_type, "timestamp with time zone");
  assert.equal(column.is_nullable, "YES");
  const { rows: [index] } = await db.query("SELECT i.indisvalid FROM pg_index i WHERE i.indexrelid=to_regclass('public.marketplace_services_active_coach')");
  assert.equal(index?.indisvalid, true);
  console.log("Production service deletion migration 016 applied and verified: nullable timestamp and valid active-service index. No service or purchase records changed.");
} catch (error) {
  // Never emit connection URLs, credentials or database error detail.
  console.error("Production service deletion migration failed.", { code: typeof error?.code === "string" ? error.code : "verification_failed" });
  process.exitCode = 1;
} finally { await db.end(); }
