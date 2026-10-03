import { X509Certificate } from "node:crypto";
import { Pool } from "pg";

export const PRIVATE_SCHEMA = "reddit_import_private";
export const PUBLIC_VIEW = "public.reddit_coach_directory";
export const SOURCE_FRESHNESS_HOURS = 36;

const FULLNAME_PATTERN = /^t3_[a-z0-9]+$/i;
const STATUS_VALUES = new Set(["review", "ready", "duplicate"]);

export const SCHEMA_SQL = `
CREATE SCHEMA IF NOT EXISTS ${PRIVATE_SCHEMA};
REVOKE ALL ON SCHEMA ${PRIVATE_SCHEMA} FROM PUBLIC;

CREATE TABLE IF NOT EXISTS ${PRIVATE_SCHEMA}.candidates (
  website_url text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('review', 'ready', 'duplicate')),
  review_cycles integer NOT NULL DEFAULT 0 CHECK (review_cycles >= 0),
  last_successful_assessment_date date,
  review jsonb NOT NULL CHECK (jsonb_typeof(review) = 'object'),
  coach_profile jsonb CHECK (coach_profile IS NULL OR jsonb_typeof(coach_profile) = 'object'),
  published_at timestamptz,
  updated_at timestamptz NOT NULL,
  CHECK ((status = 'ready' AND coach_profile IS NOT NULL AND published_at IS NOT NULL)
    OR status <> 'ready')
);

CREATE TABLE IF NOT EXISTS ${PRIVATE_SCHEMA}.source_posts (
  fullname text PRIMARY KEY CHECK (fullname ~ '^t3_[A-Za-z0-9]+$'),
  website_url text NOT NULL REFERENCES ${PRIVATE_SCHEMA}.candidates(website_url) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL,
  last_confirmed_at timestamptz NOT NULL,
  missing_since timestamptz
);

ALTER TABLE ${PRIVATE_SCHEMA}.source_posts
  ADD COLUMN IF NOT EXISTS missing_since timestamptz;

CREATE INDEX IF NOT EXISTS reddit_source_posts_website_idx
  ON ${PRIVATE_SCHEMA}.source_posts (website_url);
CREATE INDEX IF NOT EXISTS reddit_source_posts_confirmed_idx
  ON ${PRIVATE_SCHEMA}.source_posts (last_confirmed_at);

CREATE TABLE IF NOT EXISTS ${PRIVATE_SCHEMA}.suppressed_domains (
  domain_key text PRIMARY KEY
    CHECK (
      domain_key = lower(domain_key)
      AND domain_key = btrim(domain_key)
      AND char_length(domain_key) BETWEEN 3 AND 253
      AND position('.' IN domain_key) > 0
      AND domain_key !~ '^www[.]'
      AND domain_key ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?[.])+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    )
);

REVOKE ALL ON ALL TABLES IN SCHEMA ${PRIVATE_SCHEMA} FROM PUBLIC;

CREATE OR REPLACE VIEW ${PUBLIC_VIEW} (coach)
WITH (security_barrier = true) AS
SELECT candidate.coach_profile AS coach
FROM ${PRIVATE_SCHEMA}.candidates AS candidate
WHERE candidate.status = 'ready'
  AND candidate.coach_profile IS NOT NULL
  AND candidate.published_at IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM ${PRIVATE_SCHEMA}.source_posts AS source
    WHERE source.website_url = candidate.website_url
      AND source.last_confirmed_at >= CURRENT_TIMESTAMP - INTERVAL '${SOURCE_FRESHNESS_HOURS} hours'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM ${PRIVATE_SCHEMA}.suppressed_domains AS suppression
    CROSS JOIN LATERAL (
      VALUES
        (candidate.website_url),
        (candidate.coach_profile ->> 'link'),
        (candidate.coach_profile #>> '{source,url}')
    ) AS candidate_url(value)
    WHERE candidate_url.value IS NOT NULL
      AND (
        lower(regexp_replace(regexp_replace(regexp_replace(
          split_part(split_part(candidate_url.value, '://', 2), '/', 1),
          ':[0-9]+$', ''
        ), '^www[.]', ''), '[.]$', '')) = suppression.domain_key
        OR lower(regexp_replace(regexp_replace(regexp_replace(
          split_part(split_part(candidate_url.value, '://', 2), '/', 1),
          ':[0-9]+$', ''
        ), '^www[.]', ''), '[.]$', '')) LIKE '%.' || suppression.domain_key
      )
  );

REVOKE ALL ON ${PUBLIC_VIEW} FROM PUBLIC;
`;

function required(value, name) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function redditStoreConfiguration(environment = process.env) {
  const connectionString = required(
    environment.REDDIT_IMPORT_DATABASE_URL,
    "REDDIT_IMPORT_DATABASE_URL",
  );
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("REDDIT_IMPORT_DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("REDDIT_IMPORT_DATABASE_URL must be a PostgreSQL connection URL");
  }
  if (!parsed.hostname || !parsed.pathname || parsed.pathname === "/") {
    throw new Error("REDDIT_IMPORT_DATABASE_URL must identify a PostgreSQL database");
  }
  for (const key of [...parsed.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("ssl")) parsed.searchParams.delete(key);
  }
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(parsed.hostname);
  const ca = environment.REDDIT_IMPORT_DATABASE_CA?.trim();
  if (ca) {
    try {
      if (ca.length > 16_384 || !new X509Certificate(ca).ca) throw new Error();
    } catch {
      throw new Error("REDDIT_IMPORT_DATABASE_CA must contain one CA certificate");
    }
  }
  return {
    connectionString: parsed.toString(),
    ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}

function canonicalHttpUrl(value) {
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function assertIsoTimestamp(value, name) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${name} must be an ISO timestamp`);
  }
}

function candidateRow(record, appliedAt) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error("Candidate review must be an object");
  }
  const websiteUrl = canonicalHttpUrl(record.websiteUrl);
  if (!websiteUrl) throw new Error("Candidate website must be a canonical HTTP(S) URL");
  if (!STATUS_VALUES.has(record.status)) throw new Error("Candidate status is invalid");
  const reviewCycles = Number(record.reviewCycles || 0);
  if (!Number.isInteger(reviewCycles) || reviewCycles < 0) {
    throw new Error("Candidate review cycles must be a non-negative integer");
  }
  const coach = record.status === "ready" ? record.coach : null;
  if (record.status === "ready" && (!coach || typeof coach !== "object" || Array.isArray(coach))) {
    throw new Error("A ready candidate requires a website-derived coach profile");
  }
  const successfulDate =
    record.website?.checkedAt ||
    (record.proposedCoach || record.coach ? record.lastCheckedAt : null);
  return {
    websiteUrl,
    status: record.status,
    reviewCycles,
    successfulDate,
    review: record,
    coach,
    appliedAt,
  };
}

function sourceRow(source) {
  if (!FULLNAME_PATTERN.test(source?.fullname || "")) {
    throw new Error("Source fullname must be a Reddit link fullname");
  }
  const websiteUrl = canonicalHttpUrl(source.websiteUrl);
  if (!websiteUrl) throw new Error("Source website must be a canonical HTTP(S) URL");
  assertIsoTimestamp(source.confirmedAt, "Source confirmation");
  const missingSince = source.missingSince || null;
  if (missingSince !== null) {
    assertIsoTimestamp(missingSince, "Source missing-since time");
    if (Date.parse(missingSince) < Date.parse(source.confirmedAt)) {
      throw new Error("Source missing-since time cannot precede its confirmation");
    }
  }
  return {
    fullname: source.fullname,
    websiteUrl,
    confirmedAt: source.confirmedAt,
    missingSince,
  };
}

async function transaction(pool, callback, { acquireLock = true } = {}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '30s'");
    if (acquireLock) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        ["anystride:reddit-coach-import"],
      );
    }
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function createRedditCoachStore({ connectionString, ssl, pool } = {}) {
  const ownedPool = pool
    ? null
    : new Pool({
        connectionString: required(connectionString, "Reddit import database URL"),
        ssl,
        max: 2,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 10_000,
        statement_timeout: 30_000,
      });
  const database = pool || ownedPool;
  let runLockClient;

  async function ensureSchema() {
    await database.query(SCHEMA_SQL);
  }

  async function loadSnapshot() {
    const [candidateResult, sourceResult, suppressionResult] = await Promise.all([
      database.query(
        `SELECT website_url, review
         FROM ${PRIVATE_SCHEMA}.candidates
         ORDER BY website_url`,
      ),
      database.query(
        `SELECT fullname, website_url, last_confirmed_at, missing_since
         FROM ${PRIVATE_SCHEMA}.source_posts
         ORDER BY fullname`,
      ),
      database.query(
        `SELECT domain_key
         FROM ${PRIVATE_SCHEMA}.suppressed_domains
         ORDER BY domain_key`,
      ),
    ]);
    return {
      candidates: candidateResult.rows.map((row) => row.review),
      sources: sourceResult.rows.map((row) => ({
        fullname: row.fullname,
        websiteUrl: row.website_url,
        lastConfirmedAt:
          row.last_confirmed_at instanceof Date
            ? row.last_confirmed_at.toISOString()
            : String(row.last_confirmed_at),
        missingSince:
          row.missing_since instanceof Date
            ? row.missing_since.toISOString()
            : row.missing_since
              ? String(row.missing_since)
              : null,
      })),
      suppressedDomains: suppressionResult.rows.map((row) => row.domain_key),
    };
  }

  async function acquireRunLock() {
    if (runLockClient) throw new Error("This Reddit import store already holds its run lock");
    const client = await database.connect();
    try {
      const result = await client.query(
        "SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked",
        ["anystride:reddit-coach-import"],
      );
      if (result.rows[0]?.locked !== true) {
        throw new Error("Another Reddit import is already running");
      }
      runLockClient = client;
    } catch (error) {
      client.release(error);
      throw error;
    }

    let released = false;
    return async () => {
      if (released) return;
      released = true;
      let failure;
      try {
        await client.query(
          "SELECT pg_advisory_unlock(hashtextextended($1, 0)) AS unlocked",
          ["anystride:reddit-coach-import"],
        );
      } catch (error) {
        failure = error;
      } finally {
        runLockClient = undefined;
        client.release(failure);
      }
      if (failure) throw failure;
    };
  }

  async function applyPlan({ candidates, sources, appliedAt }) {
    assertIsoTimestamp(appliedAt, "Plan application time");
    if (!Array.isArray(candidates) || !Array.isArray(sources)) {
      throw new Error("Import plan candidates and sources must be arrays");
    }
    const candidateRows = candidates.map((record) => candidateRow(record, appliedAt));
    const sourceRows = sources.map(sourceRow);
    const websites = new Set(candidateRows.map((candidate) => candidate.websiteUrl));
    const sourceNames = new Set();
    for (const source of sourceRows) {
      if (!websites.has(source.websiteUrl)) {
        throw new Error("Every source must reference a candidate in the same import plan");
      }
      if (sourceNames.has(source.fullname)) {
        throw new Error("An import plan cannot contain a duplicate source fullname");
      }
      sourceNames.add(source.fullname);
    }

    return transaction(database, async (client) => {
      for (const candidate of candidateRows) {
        await client.query(
          `INSERT INTO ${PRIVATE_SCHEMA}.candidates
             (website_url, status, review_cycles, last_successful_assessment_date,
              review, coach_profile, published_at, updated_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb,
             CASE WHEN $2 = 'ready' THEN $7::timestamptz ELSE NULL END,
             $7::timestamptz)
           ON CONFLICT (website_url) DO UPDATE SET
             status = EXCLUDED.status,
             review_cycles = EXCLUDED.review_cycles,
             last_successful_assessment_date = EXCLUDED.last_successful_assessment_date,
             review = EXCLUDED.review,
             coach_profile = EXCLUDED.coach_profile,
             published_at = CASE
               WHEN EXCLUDED.status <> 'ready' THEN NULL
               ELSE COALESCE(${PRIVATE_SCHEMA}.candidates.published_at, EXCLUDED.published_at)
             END,
             updated_at = EXCLUDED.updated_at`,
          [
            candidate.websiteUrl,
            candidate.status,
            candidate.reviewCycles,
            candidate.successfulDate,
            JSON.stringify(candidate.review),
            candidate.coach ? JSON.stringify(candidate.coach) : null,
            candidate.appliedAt,
          ],
        );
      }

      for (const source of sourceRows) {
        await client.query(
          `INSERT INTO ${PRIVATE_SCHEMA}.source_posts
             (fullname, website_url, first_seen_at, last_confirmed_at, missing_since)
           VALUES ($1, $2, $3::timestamptz, $3::timestamptz, $4::timestamptz)
           ON CONFLICT (fullname) DO UPDATE SET
             website_url = EXCLUDED.website_url,
             last_confirmed_at = EXCLUDED.last_confirmed_at,
             missing_since = EXCLUDED.missing_since`,
          [source.fullname, source.websiteUrl, source.confirmedAt, source.missingSince],
        );
      }

      await client.query(
        `DELETE FROM ${PRIVATE_SCHEMA}.source_posts
         WHERE NOT (fullname = ANY($1::text[]))`,
        [[...sourceNames]],
      );
      const deletedCandidates = await client.query(
        `DELETE FROM ${PRIVATE_SCHEMA}.candidates AS candidate
         WHERE NOT EXISTS (
           SELECT 1 FROM ${PRIVATE_SCHEMA}.source_posts AS source
           WHERE source.website_url = candidate.website_url
         )
         RETURNING website_url`,
      );
      return {
        candidatesStored: new Set(sourceRows.map((source) => source.websiteUrl)).size,
        sourcesStored: sourceRows.length,
        orphanCandidatesDeleted: deletedCandidates.rows.length,
      };
    }, { acquireLock: !runLockClient });
  }

  async function purge() {
    return transaction(database, async (client) => {
      const sourceResult = await client.query(
        `DELETE FROM ${PRIVATE_SCHEMA}.source_posts RETURNING fullname`,
      );
      const candidateResult = await client.query(
        `DELETE FROM ${PRIVATE_SCHEMA}.candidates RETURNING website_url`,
      );
      return {
        sourcesDeleted: sourceResult.rows.length,
        candidatesDeleted: candidateResult.rows.length,
      };
    }, { acquireLock: !runLockClient });
  }

  async function close() {
    if (ownedPool) await ownedPool.end();
  }

  return { ensureSchema, acquireRunLock, loadSnapshot, applyPlan, purge, close };
}
