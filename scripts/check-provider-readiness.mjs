import { Pool } from "pg";

// Read-only diagnostics. Run through `vercel env run` for a named environment.
// No secret values, personal records, DDL, signups or email requests are emitted.
const report = { auth: "not_configured", emailProviderEnabled: null, signupDisabled: null, database: "not_configured", marketplaceSchemaPresent: false, usesLegacyDatabaseForReadOnlyProbe: false };
const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (origin && key) {
  try {
    const response = await fetch(`${origin.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error();
    const settings = await response.json();
    report.auth = "reachable";
    report.emailProviderEnabled = settings.external?.email === true;
    report.signupDisabled = settings.disable_signup === true;
  } catch { report.auth = "unavailable"; }
}
const connectionString = process.env.MARKETPLACE_DATABASE_URL || process.env.POSTGRES_URL;
if (connectionString) {
  report.usesLegacyDatabaseForReadOnlyProbe = !process.env.MARKETPLACE_DATABASE_URL;
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
  try {
    const result = await pool.query("SELECT to_regclass('marketplace_coaches') IS NOT NULL AND to_regclass('marketplace_services') IS NOT NULL AND to_regclass('marketplace_requests') IS NOT NULL AND to_regclass('marketplace_audit') IS NOT NULL AS present");
    report.database = "reachable";
    report.marketplaceSchemaPresent = result.rows[0].present === true;
  } catch { report.database = "unavailable"; }
  finally { await pool.end(); }
}
console.log(JSON.stringify(report, null, 2));
console.log("Read-only probe only. Email delivery, login, schema permissions and payments still need end-to-end verification.");
process.exitCode = report.auth === "reachable" && report.database === "reachable" ? 0 : 2;
