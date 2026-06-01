import { Pool } from "pg";

/**
 * Durable storage for coaching-interest signups, backed by Postgres via the
 * standard `pg` driver (TCP). Works with any Postgres provider (Neon, Supabase,
 * etc.); this route runs in the Node.js runtime so TCP connections are fine.
 *
 * Configured once a Postgres database is attached to the project (it injects
 * `POSTGRES_URL` / `DATABASE_URL`). When neither is set, `isDbConfigured()`
 * returns false and the API route falls back gracefully.
 */

// Strip any `sslmode=...` from the URL so our explicit `ssl` config below
// governs TLS (managed Postgres often presents a cert outside the public CA
// chain, which `sslmode=require` would reject).
const CONNECTION_STRING = (
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  ""
)
  .replace(/([?&])sslmode=[^&]*/gi, "$1")
  .replace(/[?&]+$/, "")
  .replace(/\?&/, "?");

export function isDbConfigured(): boolean {
  return CONNECTION_STRING.length > 0;
}

// Reuse a single pool across warm invocations. Pointed at the pooled endpoint
// (POSTGRES_URL), so a small max is plenty per instance.
let pool: Pool | undefined;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: CONNECTION_STRING,
      max: 3,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export interface Interest {
  email: string;
  goal: string;
  role: "runner" | "coach";
}

let tableReady = false;
async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS coach_interest (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      goal        TEXT NOT NULL DEFAULT '',
      role        TEXT NOT NULL DEFAULT 'runner',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  tableReady = true;
}

/**
 * Insert a signup. Re-submitting with the same email updates the existing row
 * rather than creating a duplicate.
 */
export async function saveInterest(interest: Interest): Promise<void> {
  await ensureTable();
  await getPool().query(
    `INSERT INTO coach_interest (email, goal, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (email)
     DO UPDATE SET goal = EXCLUDED.goal, role = EXCLUDED.role, updated_at = now()`,
    [interest.email, interest.goal, interest.role],
  );
}

export interface InterestRow extends Interest {
  id: number;
  created_at: string;
  updated_at: string;
}

/** List signups, newest first. */
export async function listInterest(): Promise<InterestRow[]> {
  await ensureTable();
  const { rows } = await getPool().query<InterestRow>(
    `SELECT id, email, goal, role, created_at, updated_at
     FROM coach_interest
     ORDER BY created_at DESC`,
  );
  return rows;
}
