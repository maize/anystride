import { sql } from "@vercel/postgres";

/**
 * Durable storage for coaching-interest signups, backed by Vercel Postgres.
 *
 * Configured automatically once a Vercel Postgres database is attached to the
 * project (it injects `POSTGRES_URL`). When no database is configured we report
 * `isDbConfigured() === false` so the API route can fall back gracefully.
 */

export interface Interest {
  email: string;
  goal: string;
  role: "runner" | "coach";
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

let tableReady = false;

async function ensureTable(): Promise<void> {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS coach_interest (
      id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      goal        TEXT NOT NULL DEFAULT '',
      role        TEXT NOT NULL DEFAULT 'runner',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  tableReady = true;
}

/**
 * Insert a signup. Re-submitting with the same email updates the existing row
 * rather than creating a duplicate.
 */
export async function saveInterest(interest: Interest): Promise<void> {
  await ensureTable();
  await sql`
    INSERT INTO coach_interest (email, goal, role)
    VALUES (${interest.email}, ${interest.goal}, ${interest.role})
    ON CONFLICT (email)
    DO UPDATE SET
      goal = EXCLUDED.goal,
      role = EXCLUDED.role,
      updated_at = now()
  `;
}

export interface InterestRow extends Interest {
  id: number;
  created_at: string;
  updated_at: string;
}

/** List signups, newest first. */
export async function listInterest(): Promise<InterestRow[]> {
  await ensureTable();
  const { rows } = await sql<InterestRow>`
    SELECT id, email, goal, role, created_at, updated_at
    FROM coach_interest
    ORDER BY created_at DESC
  `;
  return rows;
}
