import { pathToFileURL } from "node:url";
import { Pool } from "pg";

// Counts only. Never return names, email addresses, athlete results or account IDs.
export const activationQuery = `
WITH cohort AS (
  SELECT user_id,status,created_at FROM marketplace_coaches
  WHERE created_at >= $1::timestamptz AND created_at < $2::timestamptz
), mature AS (
  SELECT * FROM cohort WHERE created_at + interval '14 days' <= $2::timestamptz
), activated AS (
  SELECT c.user_id FROM mature c WHERE EXISTS (
    SELECT 1 FROM training_entries e WHERE e.assigned_by=c.user_id AND e.kind='workout'
      AND e.created_at >= c.created_at AND e.created_at < c.created_at + interval '14 days'
  )
)
SELECT (SELECT count(*)::int FROM cohort) AS applications_created,
  (SELECT count(*)::int FROM cohort WHERE status='approved') AS currently_approved,
  (SELECT count(*)::int FROM mature) AS applications_with_closed_14_day_window,
  (SELECT count(*)::int FROM cohort) - (SELECT count(*)::int FROM mature) AS pending_14_day_window,
  (SELECT count(*)::int FROM activated) AS coaches_with_retained_assignment_within_14_days,
  (SELECT count(*)::int FROM cohort c WHERE EXISTS (
    SELECT 1 FROM training_relationships r WHERE r.coach_id=c.user_id AND r.status='active'
  )) AS currently_connected_coaches`;

export function reportWindow(from, to, now = new Date()) {
  const valid = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  if (!valid(from) || !valid(to) || Date.parse(to) > now.getTime() || from >= to || (Date.parse(to)-Date.parse(from))/86400000 > 366) throw new Error("Use an increasing UTC date window of at most 366 days; end is exclusive.");
  return [from, to];
}
async function main() {
  const [from, to, ...flags] = process.argv.slice(2);
  const window = reportWindow(from, to);
  if (flags.some(flag => flag !== "--allow-production-read")) throw new Error("Unknown option.");
  const connectionString = process.env.MARKETPLACE_DATABASE_URL;
  if (!connectionString) throw new Error("Set an explicitly selected MARKETPLACE_DATABASE_URL; no environment files are loaded.");
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Use PostgreSQL.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && !flags.includes("--allow-production-read")) throw new Error("Remote database reads require --allow-production-read.");
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout='10s'");
      const { rows: [counts] } = await client.query(activationQuery, window);
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ from, toExclusive: to, timezone: "UTC", counts, limitations: "Current approval/relationship state, not historical states. Deleted assignments are absent. Counts cannot establish acquisition attribution, first-ever assignment time, review completion or historical conversion rates." }, null, 2));
    } finally { client.release(); }
  } finally { await pool.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error("Activation report failed. Check the date window, explicitly selected database, read authorization and schema. No account data was printed."); process.exitCode=1; });
