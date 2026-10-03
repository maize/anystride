import "server-only";
import { X509Certificate } from "node:crypto";
import { isIP } from "node:net";
import { Pool } from "pg";
import { cache } from "react";
import type { Coach, CoachFocus, CoachFormat } from "@/data/coaches";

const DIRECTORY_VIEW = "public.reddit_coach_directory";
const MAX_ROWS = 1_000;
const FORMATS = new Set<CoachFormat>(["online", "in-person", "hybrid"]);
const FOCUSES = new Set<CoachFocus>([
  "first-timers",
  "5k-10k",
  "half",
  "marathon",
  "performance",
  "injury-aware",
  "triathlon",
]);

let pool: Pool | undefined;

function databaseConfig() {
  const value = process.env.COACH_DISCOVERY_DATABASE_URL?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.pathname ||
    url.pathname === "/"
  ) return null;

  // Explicit TLS settings take precedence over connection-string aliases.
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("ssl")) url.searchParams.delete(key);
  }
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  const ca = process.env.COACH_DISCOVERY_DATABASE_CA?.trim();
  if (ca) {
    try {
      if (ca.length > 16_384 || !new X509Certificate(ca).ca) return null;
    } catch {
      return null;
    }
  }

  return {
    connectionString: url.toString(),
    ssl: local ? false as const : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}

function discoveryPool(config: NonNullable<ReturnType<typeof databaseConfig>>) {
  if (!pool) {
    pool = new Pool({
      ...config,
      max: 2,
      connectionTimeoutMillis: 3_000,
      statement_timeout: 3_000,
      idleTimeoutMillis: 10_000,
      application_name: "anystride-coach-directory",
      // Defense in depth: the configured database role should also have SELECT
      // permission on the sanitized view only.
      options: "-c default_transaction_read_only=on",
    });
    pool.on("error", () => {
      console.error("Discovered coach database connection failed.");
    });
  }
  return pool;
}

function object(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max || /[<>\u0000-\u001f\u007f]/u.test(trimmed)) return null;
  return trimmed;
}

function textList(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) return null;
  const result = value.map((item) => text(item, maxLength));
  if (result.some((item) => item === null)) return null;
  const strings = result as string[];
  if (new Set(strings.map((item) => item.toLocaleLowerCase("en-US"))).size !== strings.length) {
    return null;
  }
  return strings;
}

function website(value: unknown): string | null {
  const raw = text(value, 2_048);
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0
  ) return null;
  return url.href;
}

function isoDate(value: unknown): string | null {
  const date = text(value, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? null : date;
}

/** Validate and copy only fields that are safe for the public Coach model. */
export function parseDiscoveredCoach(value: unknown): Coach | null {
  const row = object(value);
  if (!row || row.verified !== false || "discoveredFrom" in row) return null;

  const slug = text(row.slug, 96);
  const name = text(row.name, 160);
  const city = text(row.city, 120);
  const location = text(row.location, 200);
  const blurb = text(row.blurb, 320);
  const format = text(row.format, 16) as CoachFormat | null;
  const focus = textList(row.focus, FOCUSES.size, 32) as CoachFocus[] | null;
  const specialties = textList(row.specialties, 12, 120);
  const bio = textList(row.bio, 6, 1_200);
  const link = website(row.link);
  const source = object(row.source);
  const sourceName = text(source?.name, 160);
  const sourceUrl = website(source?.url);
  const checkedAt = isoDate(row.sourceCheckedAt);
  const experience = row.experience === undefined ? undefined : text(row.experience, 120);

  if (
    !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !name || !/[\p{L}\p{N}]/u.test(name) ||
    !city || !location || !blurb ||
    !format || !FORMATS.has(format) ||
    !focus || focus.some((item) => !FOCUSES.has(item)) ||
    !specialties || !bio || !link || !sourceName || !sourceUrl || !checkedAt ||
    (row.experience !== undefined && !experience)
  ) return null;

  const linkHost = new URL(link).hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  const sourceHost = new URL(sourceUrl).hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  const sourceLabel = sourceName.toLocaleLowerCase("en-US").replace(/^www\./, "");
  if (linkHost !== sourceHost || sourceLabel !== sourceHost) return null;

  return {
    slug,
    name,
    city,
    location,
    format,
    focus,
    specialties,
    ...(experience ? { experience } : {}),
    blurb,
    bio,
    link,
    source: { name: sourceName, url: sourceUrl },
    sourceCheckedAt: checkedAt,
    verified: false,
  };
}

/**
 * Read only the sanitized public JSON projection. Missing configuration,
 * database errors, and invalid rows all fail closed to an empty result.
 */
export const loadDiscoveredCoaches = cache(async (): Promise<Coach[]> => {
  const config = databaseConfig();
  if (!config) return [];

  try {
    const result = await discoveryPool(config).query<{ coach: unknown }>(
      `SELECT coach FROM ${DIRECTORY_VIEW}
       WHERE pg_column_size(coach) <= 32768
       ORDER BY coach->>'slug'
       LIMIT ${MAX_ROWS}`,
    );
    return result.rows
      .map((row) => parseDiscoveredCoach(row.coach))
      .filter((coach): coach is Coach => coach !== null);
  } catch {
    console.error("Discovered coach catalog could not be loaded.");
    return [];
  }
});
