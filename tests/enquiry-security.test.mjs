import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { load } from "./support/load-module.mjs";

const migration = readFileSync(new URL("../db/migrations/007_private_commercial_enquiries.sql", import.meta.url), "utf8");
const enquiry = {
  id: "e7c7f0b0-ec90-4aa5-83a6-41e20d601f91", kind: "coach_match",
  name: "Security fixture", email: "security-fixture@example.invalid",
  details: { goal: "general", format: "online", location: "" }, consentVersion: "test-only",
};

async function fixture(t) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE unrelated_visitor;
    CREATE ROLE service_role BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, unrelated_visitor, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  `);
  const pool = {
    query: (sql, args) => db.query(sql, args),
    connect: async () => ({ query: (sql, args) => db.query(sql, args), release() {} }),
  };
  const store = load("src/lib/enquiry-store.ts", { "./interest-store": { getPool: () => pool } });
  return { db, store };
}

async function withRole(db, role, action) {
  assert.ok(["anon", "authenticated", "unrelated_visitor", "service_role"].includes(role));
  await db.exec(`SET ROLE ${role}`);
  try { return await action(); } finally { await db.exec("RESET ROLE"); }
}

async function assertPrivate(db) {
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_enquiries'::regclass")).rows[0].relrowsecurity, true);
  for (const role of ["anon", "authenticated", "unrelated_visitor"]) {
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      assert.equal((await db.query("SELECT has_table_privilege($1, 'public.commercial_enquiries', $2) AS allowed", [role, privilege])).rows[0].allowed, false, `${role} ${privilege}`);
    }
    for (const sql of [
      "SELECT id FROM public.commercial_enquiries WHERE false",
      "INSERT INTO public.commercial_enquiries (id,kind,name,email,details,consent_version) VALUES ('bf45248e-8a0f-48fb-b502-dc607d1b4108','coach_match','blocked','blocked@example.invalid','{}','test')",
      "UPDATE public.commercial_enquiries SET name='blocked' WHERE false",
      "DELETE FROM public.commercial_enquiries WHERE false",
    ]) await assert.rejects(withRole(db, role, () => db.query(sql)), (error) => error.code === "42501");
  }
  assert.equal((await withRole(db, "service_role", () => db.query("SELECT count(*)::int AS n FROM public.commercial_enquiries"))).rows[0].n, 1);
}

test("new enquiry storage commits private while server submission, retry and export still work", async (t) => {
  const { db, store } = await fixture(t);
  assert.equal(await store.saveEnquiry(enquiry), "created");
  assert.equal(await store.saveEnquiry(enquiry), "duplicate");
  assert.equal((await store.listEnquiries())[0].id, enquiry.id);
  await assertPrivate(db);
});

test("migration removes existing public grants, preserves data and server access, and is repeatable", async (t) => {
  const { db, store } = await fixture(t);
  await store.saveEnquiry(enquiry);
  await db.exec("ALTER TABLE public.commercial_enquiries DISABLE ROW LEVEL SECURITY; GRANT ALL ON public.commercial_enquiries TO anon, authenticated, PUBLIC;");
  assert.equal((await withRole(db, "anon", () => db.query("SELECT count(*)::int AS n FROM public.commercial_enquiries"))).rows[0].n, 1);
  await db.exec(migration);
  await db.exec(migration);
  await assertPrivate(db);
  assert.equal((await store.listEnquiries())[0].email, enquiry.email);
  assert.equal(await store.saveEnquiry({ ...enquiry, id: "6b26c1af-7d19-4083-8959-c9391d16e7de" }), "created");
});

test("plain PostgreSQL without Supabase roles still initializes private storage", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec("CREATE ROLE unrelated_visitor; GRANT USAGE ON SCHEMA public TO unrelated_visitor; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO PUBLIC;");
  const pool = {
    query: (sql, args) => db.query(sql, args),
    connect: async () => ({ query: (sql, args) => db.query(sql, args), release() {} }),
  };
  const store = load("src/lib/enquiry-store.ts", { "./interest-store": { getPool: () => pool } });
  assert.equal(await store.saveEnquiry(enquiry), "created");
  assert.equal((await store.listEnquiries())[0].id, enquiry.id);
  assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.commercial_enquiries'::regclass")).rows[0].relrowsecurity, true);
  await assert.rejects(withRole(db, "unrelated_visitor", () => db.query("SELECT id FROM public.commercial_enquiries WHERE false")), (error) => error.code === "42501");
});

test("failed protection rolls back the new table and initialization remains retryable", async (t) => {
  const { db } = await fixture(t);
  let fail = true;
  let releases = 0;
  const store = load("src/lib/enquiry-store.ts", { "./interest-store": { getPool: () => ({
    connect: async () => ({
      query: async (sql, args) => {
        if (fail && sql.startsWith("REVOKE")) { fail = false; throw new Error("fixture permission failure"); }
        return db.query(sql, args);
      },
      release: () => { releases++; },
    }),
  }) } });
  await assert.rejects(store.saveEnquiry(enquiry), /fixture permission failure/);
  assert.equal((await db.query("SELECT to_regclass('public.commercial_enquiries') AS table_name")).rows[0].table_name, null);
  assert.equal(releases, 1);
  assert.equal(await store.saveEnquiry(enquiry), "created");
  await assertPrivate(db);
});
