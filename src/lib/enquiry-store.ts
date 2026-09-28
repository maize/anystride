import { getPool } from "./interest-store";
import type { Enquiry } from "./enquiries";

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS commercial_enquiries (
      id UUID PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('coach_match', 'partnership')),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      details JSONB NOT NULL,
      consent_version TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await getPool().query("CREATE INDEX IF NOT EXISTS commercial_enquiries_created_idx ON commercial_enquiries (created_at DESC)");
  tableReady = true;
}

/** Durable deduplication and conservative pilot limits, shared across server instances. */
export async function saveEnquiry(enquiry: Enquiry): Promise<"created" | "duplicate" | "limited" | "conflict"> {
  await ensureTable();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '5s'");
    // Serialize this low-volume pilot's check-and-insert to avoid rate-limit races.
    await client.query("SELECT pg_advisory_xact_lock(7162031)");
    const existing = await client.query("SELECT id, kind, name, email, details, consent_version FROM commercial_enquiries WHERE id = $1", [enquiry.id]);
    if (existing.rows.length) {
      const previous = existing.rows[0];
      const identical = previous.kind === enquiry.kind && previous.name === enquiry.name &&
        previous.email === enquiry.email && previous.consent_version === enquiry.consentVersion &&
        Object.keys(previous.details).length === Object.keys(enquiry.details).length &&
        Object.entries(enquiry.details).every(([key, value]) => previous.details[key] === value);
      await client.query("COMMIT");
      return identical ? "duplicate" : "conflict";
    }
    const count = await client.query<{ total: number; per_email: number }>(`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE email = $1)::int AS per_email
      FROM commercial_enquiries WHERE created_at > now() - interval '1 hour'
    `, [enquiry.email]);
    if (count.rows[0].total >= 100 || count.rows[0].per_email >= 3) {
      await client.query("COMMIT");
      return "limited";
    }
    await client.query(`
      INSERT INTO commercial_enquiries (id, kind, name, email, details, consent_version)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [enquiry.id, enquiry.kind, enquiry.name, enquiry.email, JSON.stringify(enquiry.details), enquiry.consentVersion]);
    await client.query("COMMIT");
    return "created";
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listEnquiries() {
  await ensureTable();
  const { rows } = await getPool().query(`
    SELECT id, kind, name, email, details, consent_version, created_at
    FROM commercial_enquiries ORDER BY created_at DESC, id DESC LIMIT 100
  `);
  return rows;
}
