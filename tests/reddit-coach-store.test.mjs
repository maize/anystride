import assert from "node:assert/strict";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import {
  REDDIT_LIFECYCLE_LIMITS,
  runImport,
} from "../scripts/import-reddit-coaches.mjs";
import {
  createRedditClient,
  redditConfiguration,
} from "../scripts/lib/reddit-client.mjs";
import {
  createRedditCoachStore,
  PUBLIC_VIEW,
  redditStoreConfiguration,
  SCHEMA_SQL,
} from "../scripts/lib/reddit-coach-store.mjs";

const NOW = new Date("2026-10-03T12:00:00.000Z");

const approvedEnvironment = (overrides = {}) => ({
  REDDIT_IMPORT_ENABLED: "true",
  REDDIT_APPROVAL_DATA_API: "true",
  REDDIT_APPROVAL_COMMERCIAL_USE: "true",
  REDDIT_APPROVAL_OFF_PLATFORM_LINKING: "true",
  REDDIT_APPROVAL_PUBLIC_DIRECTORY: "true",
  REDDIT_APPROVAL_DELETION_PROCESS: "true",
  REDDIT_APPROVAL_REFERENCE: "written-approval-fixture",
  REDDIT_APPROVAL_REVIEWER: "fixture-reviewer",
  REDDIT_CLIENT_ID: "fixture-client",
  REDDIT_CLIENT_SECRET: "fixture-secret",
  REDDIT_USER_AGENT: "script:anystride:v1.0 (by /u/fixturebot)",
  REDDIT_IMPORT_DATABASE_URL: "postgresql://db.example/anystride_import_fixture",
  ...overrides,
});

function response(value, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function coachPost({
  name = "t3_fixture",
  website = "https://db-pipeline-fixture.example/coaching",
  created = NOW.getTime() / 1_000,
  removed = false,
} = {}) {
  return {
    id: name.slice(3),
    name,
    author: "fixture_coach",
    created_utc: created,
    title: "I'm a running coach with coaching spots available",
    selftext:
      `I coach runners and am accepting new athletes for personalized online marathon coaching. ` +
      `My coaching website is ${website}.`,
    ...(removed ? { removed_by_category: "moderator", selftext: "[removed]" } : {}),
  };
}

function coachProfile(websiteUrl, name = "Database Pipeline Fixture") {
  return {
    slug: "coach-database-pipeline-fixture",
    name,
    city: "Online",
    location: "Online",
    format: "online",
    focus: ["marathon"],
    specialties: ["Marathon"],
    blurb: `${name} offers online running coaching.`,
    bio: ["Offers personalized online marathon coaching."],
    link: websiteUrl,
    source: { name: new URL(websiteUrl).hostname, url: websiteUrl },
    sourceCheckedAt: "2026-10-03",
    verified: false,
  };
}

function readyAssessment({ url }) {
  return {
    status: "ready",
    score: 115,
    reasonCodes: [],
    evidence: ["website presents a personal coaching service"],
    coach: coachProfile(url),
  };
}

function reviewRecord(websiteUrl, overrides = {}) {
  return {
    schemaVersion: 1,
    websiteUrl,
    status: "review",
    reviewCycles: 2,
    firstCheckedAt: "2026-10-01",
    lastCheckedAt: "2026-10-02",
    score: 115,
    reasonCodes: ["shadow-review-required"],
    website: { url: websiteUrl, checkedAt: "2026-10-02", evidence: [] },
    proposedCoach: coachProfile(websiteUrl),
    ...overrides,
  };
}

function fakeStore(snapshot = { candidates: [], sources: [] }) {
  const state = { ensured: 0, closed: 0, purged: 0, plans: [] };
  return {
    state,
    store: {
      async ensureSchema() {
        state.ensured += 1;
      },
      async loadSnapshot() {
        return structuredClone(snapshot);
      },
      async applyPlan(plan) {
        state.plans.push(structuredClone(plan));
        return { candidatesStored: plan.candidates.length, sourcesStored: plan.sources.length };
      },
      async purge() {
        state.purged += 1;
        return { sourcesDeleted: 4, candidatesDeleted: 2 };
      },
      async close() {
        state.closed += 1;
      },
    },
  };
}

test("private import configuration never falls back to a general application database", () => {
  assert.throws(
    () => redditStoreConfiguration({ DATABASE_URL: "postgresql://db.example/general" }),
    /REDDIT_IMPORT_DATABASE_URL is required/,
  );
  assert.throws(
    () => redditStoreConfiguration({ REDDIT_IMPORT_DATABASE_URL: "https://db.example" }),
    /PostgreSQL connection URL/,
  );
  assert.deepEqual(
    redditStoreConfiguration({
      REDDIT_IMPORT_DATABASE_URL: "postgresql://db.example/private",
    }),
    {
      connectionString: "postgresql://db.example/private",
      ssl: { rejectUnauthorized: true },
    },
  );
  assert.deepEqual(
    redditStoreConfiguration({
      REDDIT_IMPORT_DATABASE_URL:
        "postgresql://localhost/private?sslmode=no-verify&application_name=fixture",
    }),
    {
      connectionString: "postgresql://localhost/private?application_name=fixture",
      ssl: false,
    },
  );
});

test("every approval purpose and a reviewer fail closed independently", () => {
  for (const variable of [
    "REDDIT_APPROVAL_DATA_API",
    "REDDIT_APPROVAL_COMMERCIAL_USE",
    "REDDIT_APPROVAL_OFF_PLATFORM_LINKING",
    "REDDIT_APPROVAL_PUBLIC_DIRECTORY",
    "REDDIT_APPROVAL_DELETION_PROCESS",
  ]) {
    assert.throws(
      () => redditConfiguration(approvedEnvironment({ [variable]: "false" })),
      new RegExp(`${variable}=true`),
    );
  }
  assert.throws(
    () => redditConfiguration(approvedEnvironment({ REDDIT_APPROVAL_REVIEWER: " " })),
    /REDDIT_APPROVAL_REVIEWER is required/,
  );
});

test("normal runs validate approval before database setup; purge uses its own gate", async () => {
  let storeCalls = 0;
  await assert.rejects(
    runImport({
      environment: {},
      options: { dryRun: false, purge: false, help: false },
      storeFactory: () => {
        storeCalls += 1;
        return {};
      },
    }),
    /import is disabled/i,
  );
  await assert.rejects(
    runImport({
      environment: {},
      options: { dryRun: false, purge: true, help: false },
      storeFactory: () => {
        storeCalls += 1;
        return {};
      },
    }),
    /REDDIT_PURGE_APPROVED=true/,
  );
  assert.equal(storeCalls, 0);
});

test("the public view exposes only fresh website-derived coach JSON", () => {
  assert.equal(PUBLIC_VIEW, "public.reddit_coach_directory");
  assert.match(SCHEMA_SQL, /CREATE OR REPLACE VIEW public\.reddit_coach_directory \(coach\)/);
  assert.match(SCHEMA_SQL, /candidate\.coach_profile AS coach/);
  assert.match(SCHEMA_SQL, /candidate\.status = 'ready'/);
  assert.match(SCHEMA_SQL, /last_confirmed_at >= CURRENT_TIMESTAMP - INTERVAL '36 hours'/);
  assert.match(SCHEMA_SQL, /missing_since timestamptz/);
  assert.match(
    SCHEMA_SQL,
    /CREATE TABLE IF NOT EXISTS reddit_import_private\.suppressed_domains/,
  );
  assert.match(
    SCHEMA_SQL.slice(SCHEMA_SQL.indexOf("CREATE OR REPLACE VIEW")),
    /NOT EXISTS[\s\S]*reddit_import_private\.suppressed_domains/,
  );
  assert.doesNotMatch(
    SCHEMA_SQL.slice(SCHEMA_SQL.indexOf("CREATE OR REPLACE VIEW")),
    /SELECT[^;]*(?:fullname|last_confirmed_at)\s+AS/,
  );
  assert.match(SCHEMA_SQL, /REVOKE ALL ON SCHEMA reddit_import_private FROM PUBLIC/);
  assert.match(SCHEMA_SQL, /REVOKE ALL ON public\.reddit_coach_directory FROM PUBLIC/);
});

test("the private snapshot loads only suppression domain keys", async () => {
  const store = createRedditCoachStore({
    pool: {
      async query(text) {
        if (/FROM reddit_import_private\.candidates/.test(text)) return { rows: [] };
        if (/FROM reddit_import_private\.source_posts/.test(text)) return { rows: [] };
        if (/FROM reddit_import_private\.suppressed_domains/.test(text)) {
          return { rows: [{ domain_key: "blocked-coach.example" }] };
        }
        throw new Error("unexpected snapshot query");
      },
    },
  });

  assert.deepEqual(await store.loadSnapshot(), {
    candidates: [],
    sources: [],
    suppressedDomains: ["blocked-coach.example"],
  });
});

test("the public view hides a matching domain as soon as an operator suppresses it", async () => {
  const database = new PGlite();
  const websiteUrl = "https://discovery.blocked-coach.example/coaching";
  try {
    await database.exec(SCHEMA_SQL);
    await database.query(
      `INSERT INTO reddit_import_private.candidates
         (website_url, status, review_cycles, last_successful_assessment_date,
          review, coach_profile, published_at, updated_at)
       VALUES ($1, 'ready', 4, CURRENT_DATE, $2::jsonb, $3::jsonb,
         CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [websiteUrl, JSON.stringify({ fixture: true }), JSON.stringify(coachProfile(websiteUrl))],
    );
    await database.query(
      `INSERT INTO reddit_import_private.source_posts
         (fullname, website_url, first_seen_at, last_confirmed_at)
       VALUES ('t3_suppressionview', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [websiteUrl],
    );
    assert.equal((await database.query(`SELECT coach FROM ${PUBLIC_VIEW}`)).rows.length, 1);

    await database.query(
      `INSERT INTO reddit_import_private.suppressed_domains (domain_key)
       VALUES ('blocked-coach.example')`,
    );
    assert.equal((await database.query(`SELECT coach FROM ${PUBLIC_VIEW}`)).rows.length, 0);

    await database.query(
      `DELETE FROM reddit_import_private.suppressed_domains
       WHERE domain_key = 'blocked-coach.example'`,
    );
    assert.equal((await database.query(`SELECT coach FROM ${PUBLIC_VIEW}`)).rows.length, 1);
  } finally {
    await database.close();
  }
});

test("store applies a full source/candidate plan in one transaction", async () => {
  const calls = [];
  const client = {
    async query(text, values) {
      calls.push({ text, values });
      if (/DELETE FROM reddit_import_private\.candidates AS candidate/.test(text)) {
        return { rows: [] };
      }
      return { rows: [] };
    },
    release() {
      calls.push({ text: "RELEASE" });
    },
  };
  const pool = {
    async query() {
      return { rows: [] };
    },
    async connect() {
      return client;
    },
  };
  const store = createRedditCoachStore({ pool });
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  const record = {
    schemaVersion: 1,
    websiteUrl,
    status: "ready",
    reviewCycles: 4,
    firstCheckedAt: "2026-09-30",
    lastCheckedAt: "2026-10-03",
    score: 115,
    reasonCodes: [],
    website: { url: websiteUrl, checkedAt: "2026-10-03", evidence: [] },
    coachSlug: "coach-database-pipeline-fixture",
    coach: coachProfile(websiteUrl),
  };

  await store.applyPlan({
    candidates: [record],
    sources: [{ fullname: "t3_fixture", websiteUrl, confirmedAt: NOW.toISOString() }],
    appliedAt: NOW.toISOString(),
  });

  assert.equal(calls[0].text, "BEGIN");
  assert.ok(calls.some((call) => /INSERT INTO reddit_import_private\.candidates/.test(call.text)));
  const sourceInsert = calls.find((call) =>
    /INSERT INTO reddit_import_private\.source_posts/.test(call.text),
  );
  assert.ok(sourceInsert);
  assert.match(sourceInsert.text, /missing_since/);
  assert.equal(sourceInsert.values[3], null);
  assert.ok(calls.some((call) => /fullname = ANY\(\$1::text\[\]\)/.test(call.text)));
  assert.equal(calls.at(-2).text, "COMMIT");
  assert.equal(calls.at(-1).text, "RELEASE");
});

test("store rolls back the complete plan when any write fails", async () => {
  const calls = [];
  const client = {
    async query(text) {
      calls.push(text);
      if (/INSERT INTO reddit_import_private\.source_posts/.test(text)) {
        throw new Error("synthetic database failure");
      }
      return { rows: [] };
    },
    release() {
      calls.push("RELEASE");
    },
  };
  const store = createRedditCoachStore({
    pool: { connect: async () => client, query: async () => ({ rows: [] }) },
  });
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  await assert.rejects(
    store.applyPlan({
      candidates: [
        {
          websiteUrl,
          status: "review",
          reviewCycles: 1,
          lastCheckedAt: "2026-10-03",
          reasonCodes: ["shadow-review-required"],
          proposedCoach: coachProfile(websiteUrl),
        },
      ],
      sources: [{ fullname: "t3_fixture", websiteUrl, confirmedAt: NOW.toISOString() }],
      appliedAt: NOW.toISOString(),
    }),
    /synthetic database failure/,
  );
  assert.ok(calls.includes("ROLLBACK"));
  assert.ok(!calls.includes("COMMIT"));
  assert.equal(calls.at(-1), "RELEASE");
});

test("a session advisory lock serializes planning without self-blocking apply", async () => {
  const calls = [];
  const lockClient = {
    async query(text) {
      calls.push(`lock:${text}`);
      if (/pg_try_advisory_lock/.test(text)) return { rows: [{ locked: true }] };
      return { rows: [{ unlocked: true }] };
    },
    release() {
      calls.push("lock:RELEASE");
    },
  };
  const transactionClient = {
    async query(text) {
      calls.push(`transaction:${text}`);
      return { rows: [] };
    },
    release() {
      calls.push("transaction:RELEASE");
    },
  };
  let connections = 0;
  const store = createRedditCoachStore({
    pool: {
      async query() {
        return { rows: [] };
      },
      async connect() {
        connections += 1;
        return connections === 1 ? lockClient : transactionClient;
      },
    },
  });

  const release = await store.acquireRunLock();
  await store.applyPlan({ candidates: [], sources: [], appliedAt: NOW.toISOString() });
  await release();

  assert.ok(calls.some((call) => call.includes("pg_try_advisory_lock")));
  assert.ok(calls.some((call) => call.includes("pg_advisory_unlock")));
  assert.ok(
    !calls.some((call) => call.startsWith("transaction:") && call.includes("pg_advisory_xact_lock")),
  );
});

test("bulk source revalidation is origin locked and batches fullnames", async () => {
  const calls = [];
  const client = createRedditClient(redditConfiguration(approvedEnvironment()), {
    fetchImpl: async (input, options) => {
      const url = String(input);
      calls.push({ url, options });
      if (url === "https://www.reddit.com/api/v1/access_token") {
        return response({ access_token: "fixture-token" });
      }
      const requested = new URL(url).searchParams.get("id").split(",");
      return response({
        data: { children: requested.map((name) => ({ data: { name } })) },
      });
    },
    sleep: async () => {},
  });
  const fullnames = Array.from({ length: 101 }, (_, index) => `t3_${index.toString(36)}`);
  const posts = await client.postsByFullnames(fullnames);

  assert.equal(posts.length, 101);
  const infoCalls = calls.filter((call) => call.url.startsWith("https://oauth.reddit.com/api/info"));
  assert.equal(infoCalls.length, 2);
  assert.ok(calls.every((call) => call.options.redirect === "error"));
  await assert.rejects(client.request("//attacker.example/path"), /origin-relative path/);
  await assert.rejects(client.request("https://attacker.example/path"), /origin-relative path/);
});

test("an API failure refreshes no source confirmations and applies no deletion plan", async () => {
  const fixture = fakeStore({
    candidates: [],
    sources: [
      {
        fullname: "t3_existing",
        websiteUrl: "https://db-pipeline-fixture.example/coaching",
        lastConfirmedAt: "2026-10-01T12:00:00.000Z",
      },
    ],
  });
  let discoveryCalls = 0;
  await assert.rejects(
    runImport({
      environment: approvedEnvironment(),
      options: { dryRun: false, purge: false, help: false },
      now: NOW,
      storeFactory: () => fixture.store,
      clientFactory: () => ({
        postsByFullnames: async () => {
          throw new Error("synthetic API outage");
        },
      }),
      discover: async () => {
        discoveryCalls += 1;
        return [];
      },
    }),
    /synthetic API outage/,
  );
  assert.equal(discoveryCalls, 0);
  assert.equal(fixture.state.plans.length, 0);
  assert.equal(fixture.state.closed, 1);
});

test("one malformed website cannot stop other confirmed candidates from being stored", async () => {
  const malformedUrl = "https://malformed-coach.example/coaching";
  const validUrl = "https://valid-coach.example/coaching";
  const fixture = fakeStore();

  await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({ postsByFullnames: async () => [] }),
    discover: async () => [
      coachPost({ name: "t3_malformed", website: malformedUrl }),
      coachPost({ name: "t3_valid", website: validUrl }),
    ],
    fetchWebsite: async (url) => ({ status: "fetched", url, html: url }),
    parseWebsite: ({ url }) => {
      if (url === malformedUrl) throw new Error("synthetic malformed markup");
      return readyAssessment({ url });
    },
  });

  const records = fixture.state.plans[0].candidates;
  assert.equal(records.length, 2);
  assert.deepEqual(
    records.find((record) => record.websiteUrl === malformedUrl).reasonCodes,
    ["website-parse-failed"],
  );
  assert.deepEqual(
    records.find((record) => record.websiteUrl === validUrl).reasonCodes,
    ["shadow-review-required"],
  );
  assert.equal(fixture.state.plans[0].sources.length, 2);
});

test("a suppressed coach domain is excluded before revalidation and cannot be rediscovered", async () => {
  const blockedUrl = "https://blocked-coach.example/coaching";
  const relayUrl = "https://relay-coach.example/coaching";
  const fixture = fakeStore({
    candidates: [reviewRecord(blockedUrl)],
    sources: [
      {
        fullname: "t3_existingblocked",
        websiteUrl: blockedUrl,
        lastConfirmedAt: NOW.toISOString(),
      },
    ],
    suppressedDomains: ["blocked-coach.example"],
  });
  let requestedFullnames;
  const fetched = [];
  let parseCalls = 0;

  const summary = await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async (fullnames) => {
        requestedFullnames = fullnames;
        return [];
      },
    }),
    discover: async () => [
      coachPost({
        name: "t3_directblocked",
        website: "https://www.blocked-coach.example/new",
      }),
      coachPost({ name: "t3_relay", website: relayUrl }),
    ],
    fetchWebsite: async (url) => {
      fetched.push(url);
      return { status: "fetched", url: blockedUrl, html: "fixture" };
    },
    parseWebsite: () => {
      parseCalls += 1;
      return readyAssessment({ url: blockedUrl });
    },
  });

  assert.deepEqual(requestedFullnames, []);
  assert.deepEqual(fetched, [relayUrl]);
  assert.equal(parseCalls, 0, "a redirect to a suppressed domain must be rejected before parsing");
  assert.equal(summary.suppressedDomainCount, 1);
  assert.equal(summary.suppressedCandidatesExcluded, 1);
  assert.equal(summary.sourceAssociationsDeleted, 1);
  assert.equal(summary.candidatesDeleted, 1);
  assert.deepEqual(fixture.state.plans[0].candidates, []);
  assert.deepEqual(fixture.state.plans[0].sources, []);
});

test("a partial successful bulk response defers omitted sources without refreshing them", async () => {
  const confirmedUrl = "https://confirmed-coach.example/coaching";
  const omittedUrl = "https://omitted-coach.example/coaching";
  const previousConfirmation = "2026-10-02T12:00:00.000Z";
  const fixture = fakeStore({
    candidates: [reviewRecord(confirmedUrl), reviewRecord(omittedUrl)],
    sources: [
      {
        fullname: "t3_confirmed",
        websiteUrl: confirmedUrl,
        lastConfirmedAt: previousConfirmation,
      },
      {
        fullname: "t3_omitted",
        websiteUrl: omittedUrl,
        lastConfirmedAt: previousConfirmation,
      },
    ],
  });
  const fetched = [];

  const summary = await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async () => [
        coachPost({ name: "t3_confirmed", website: confirmedUrl }),
      ],
    }),
    discover: async () => [],
    fetchWebsite: async (url) => {
      fetched.push(url);
      return { status: "fetched", url, html: "fixture" };
    },
    parseWebsite: readyAssessment,
  });

  assert.equal(summary.sourceAssociationsConfirmed, 1);
  assert.equal(summary.sourceAssociationsDeferred, 1);
  assert.equal(summary.sourceAssociationsDeleted, 0);
  assert.deepEqual(fetched, [confirmedUrl]);
  const plan = fixture.state.plans[0];
  const omitted = plan.sources.find((source) => source.fullname === "t3_omitted");
  assert.deepEqual(omitted, {
    fullname: "t3_omitted",
    websiteUrl: omittedUrl,
    confirmedAt: previousConfirmation,
    missingSince: NOW.toISOString(),
  });
  assert.ok(
    plan.candidates.some((candidate) => candidate.websiteUrl === omittedUrl),
    "an ambiguous omission must keep its candidate through the grace window",
  );
});

test("a second successful omission after the grace window hard-deletes the source and orphan", async () => {
  const websiteUrl = "https://twice-omitted.example/coaching";
  const fixture = fakeStore({
    candidates: [reviewRecord(websiteUrl)],
    sources: [
      {
        fullname: "t3_twiceomitted",
        websiteUrl,
        lastConfirmedAt: "2026-10-01T12:00:00.000Z",
        missingSince: "2026-10-02T11:59:59.000Z",
      },
    ],
  });

  const summary = await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({ postsByFullnames: async () => [] }),
    discover: async () => [],
  });

  assert.equal(summary.sourceAssociationsDeleted, 1);
  assert.equal(summary.candidatesDeleted, 1);
  assert.deepEqual(fixture.state.plans[0].sources, []);
  assert.deepEqual(fixture.state.plans[0].candidates, []);
});

test("retention expires non-public candidates but never age-prunes a published listing", async () => {
  const readyUrl = "https://retained-ready.example/coaching";
  const reviewUrl = "https://expired-review.example/coaching";
  const duplicateUrl = "https://expired-duplicate.example/coaching";
  const ready = {
    ...reviewRecord(readyUrl),
    status: "ready",
    reviewCycles: 4,
    firstCheckedAt: "2026-01-01",
    lastCheckedAt: "2026-10-02",
    reasonCodes: [],
    coach: coachProfile(readyUrl, "Retained Ready Coach"),
  };
  delete ready.proposedCoach;
  const fixture = fakeStore({
    candidates: [
      ready,
      reviewRecord(reviewUrl, { nonReadySince: "2026-08-01" }),
      reviewRecord(duplicateUrl, {
        status: "duplicate",
        nonReadySince: "2026-09-01",
        reasonCodes: ["already-listed"],
      }),
    ],
    sources: [
      { fullname: "t3_ready", websiteUrl: readyUrl, lastConfirmedAt: NOW.toISOString() },
      { fullname: "t3_review", websiteUrl: reviewUrl, lastConfirmedAt: NOW.toISOString() },
      {
        fullname: "t3_duplicate",
        websiteUrl: duplicateUrl,
        lastConfirmedAt: NOW.toISOString(),
      },
    ],
  });
  let requestedFullnames;

  const summary = await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async (fullnames) => {
        requestedFullnames = fullnames;
        return [coachPost({ name: "t3_ready", website: readyUrl })];
      },
    }),
    discover: async () => [],
    fetchWebsite: async (url) => ({ status: "fetched", url, html: "fixture" }),
    parseWebsite: ({ url }) => ({
      ...readyAssessment({ url }),
      coach: coachProfile(url, "Retained Ready Coach"),
    }),
  });

  assert.deepEqual(requestedFullnames, ["t3_ready"]);
  assert.equal(summary.lifecycleCandidatesPruned, 2);
  assert.equal(summary.lifecycleSourcesPruned, 2);
  assert.equal(summary.publicListings, 1);
  assert.deepEqual(
    fixture.state.plans[0].candidates.map((candidate) => candidate.websiteUrl),
    [readyUrl],
  );
});

test("active-candidate and per-candidate source caps bound every daily revalidation", async () => {
  const candidateCount = REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates + 1;
  const sourcesPerCandidate = REDDIT_LIFECYCLE_LIMITS.maximumSourcesPerCandidate + 1;
  const candidates = [];
  const sources = [];
  for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
    const websiteUrl = `https://bounded-${candidateIndex}.example/coaching`;
    candidates.push(
      reviewRecord(websiteUrl, {
        firstCheckedAt: "2026-10-03",
        lastCheckedAt: "2026-10-03",
        nonReadySince: "2026-10-03",
      }),
    );
    for (let sourceIndex = 0; sourceIndex < sourcesPerCandidate; sourceIndex += 1) {
      sources.push({
        fullname: `t3_${(candidateIndex * sourcesPerCandidate + sourceIndex).toString(36)}`,
        websiteUrl,
        lastConfirmedAt: NOW.toISOString(),
      });
    }
  }
  const fixture = fakeStore({ candidates, sources });
  let requestedCount = 0;
  let websiteFetches = 0;

  const summary = await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async (fullnames) => {
        requestedCount = fullnames.length;
        return [];
      },
    }),
    discover: async () => [],
    fetchWebsite: async () => {
      websiteFetches += 1;
      throw new Error("ambiguous omissions must not fetch websites");
    },
  });

  const expectedSources =
    REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates *
    REDDIT_LIFECYCLE_LIMITS.maximumSourcesPerCandidate;
  assert.equal(requestedCount, expectedSources);
  assert.equal(websiteFetches, 0);
  assert.equal(fixture.state.plans[0].candidates.length, REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates);
  assert.equal(fixture.state.plans[0].sources.length, expectedSources);
  assert.equal(summary.lifecycleCandidatesPruned, 1);
  assert.equal(
    summary.lifecycleSourcesPruned,
    sources.length - expectedSources,
  );
});

test("removed sources are hard-deleted from the atomic plan with orphan candidates", async () => {
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  const previous = {
    schemaVersion: 1,
    websiteUrl,
    status: "review",
    reviewCycles: 2,
    firstCheckedAt: "2026-10-01",
    lastCheckedAt: "2026-10-02",
    reasonCodes: ["shadow-review-required"],
    proposedCoach: coachProfile(websiteUrl),
  };
  const fixture = fakeStore({
    candidates: [previous],
    sources: [
      {
        fullname: "t3_removed",
        websiteUrl,
        lastConfirmedAt: "2026-10-02T12:00:00.000Z",
      },
    ],
  });

  const summary = await runImport({
    environment: approvedEnvironment(),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async () => [coachPost({ name: "t3_removed", removed: true })],
    }),
    discover: async () => [],
  });

  assert.equal(summary.sourceAssociationsDeleted, 1);
  assert.equal(summary.candidatesDeleted, 1);
  assert.deepEqual(fixture.state.plans[0].sources, []);
  assert.deepEqual(fixture.state.plans[0].candidates, []);
});

test("four distinct successful assessment dates can publish only in approved publish mode", async () => {
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  const previous = {
    schemaVersion: 1,
    websiteUrl,
    status: "review",
    reviewCycles: 3,
    firstCheckedAt: "2026-09-30",
    lastCheckedAt: "2026-10-02",
    score: 115,
    reasonCodes: ["shadow-review-required"],
    website: { url: websiteUrl, checkedAt: "2026-10-02", evidence: [] },
    proposedCoach: coachProfile(websiteUrl),
  };
  const fixture = fakeStore({
    candidates: [previous],
    sources: [
      {
        fullname: "t3_existing",
        websiteUrl,
        lastConfirmedAt: "2026-10-02T12:00:00.000Z",
      },
    ],
  });

  const summary = await runImport({
    environment: approvedEnvironment({
      REDDIT_IMPORT_MODE: "publish",
      REDDIT_PUBLICATION_APPROVED: "true",
    }),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async () => [
        coachPost({ name: "t3_existing", created: Date.UTC(2025, 0, 1) / 1_000 }),
      ],
    }),
    discover: async () => [],
    fetchWebsite: async (url) => ({ status: "fetched", url, html: "fixture" }),
    parseWebsite: readyAssessment,
  });

  assert.equal(summary.additions, 1);
  assert.equal(fixture.state.plans[0].candidates[0].status, "ready");
  assert.equal(fixture.state.plans[0].candidates[0].reviewCycles, 4);
  assert.ok(fixture.state.plans[0].candidates[0].coach);
});

test("a material coach identity change resets a published site to four-cycle review", async () => {
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  const replacementUrl = "https://replacement-coach.example/coaching";
  const previous = {
    schemaVersion: 1,
    websiteUrl,
    status: "ready",
    reviewCycles: 8,
    firstCheckedAt: "2026-09-20",
    lastCheckedAt: "2026-10-02",
    score: 115,
    reasonCodes: [],
    website: { url: websiteUrl, checkedAt: "2026-10-02", evidence: [] },
    coach: coachProfile(websiteUrl),
  };
  const fixture = fakeStore({
    candidates: [previous],
    sources: [
      {
        fullname: "t3_existing",
        websiteUrl,
        lastConfirmedAt: "2026-10-02T12:00:00.000Z",
      },
    ],
  });
  const replacementCoach = {
    ...coachProfile(replacementUrl, "Replacement Coach"),
    slug: "coach-replacement-coach",
  };

  const summary = await runImport({
    environment: approvedEnvironment({
      REDDIT_IMPORT_MODE: "publish",
      REDDIT_PUBLICATION_APPROVED: "true",
    }),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async () => [coachPost({ name: "t3_existing", website: websiteUrl })],
    }),
    discover: async () => [],
    fetchWebsite: async () => ({ status: "fetched", url: replacementUrl, html: "fixture" }),
    parseWebsite: () => ({
      status: "ready",
      score: 115,
      reasonCodes: [],
      evidence: ["replacement identity fixture"],
      coach: replacementCoach,
    }),
  });

  const record = fixture.state.plans[0].candidates[0];
  assert.equal(record.status, "review");
  assert.equal(record.reviewCycles, 1);
  assert.equal(record.firstCheckedAt, "2026-10-03");
  assert.equal(record.proposedCoach.name, "Replacement Coach");
  assert.equal("coach" in record, false);
  assert.equal(summary.removals, 1);
});

test("a repeat assessment on the same UTC date does not advance the review cycle", async () => {
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  const previous = {
    websiteUrl,
    status: "review",
    reviewCycles: 3,
    firstCheckedAt: "2026-09-30",
    lastCheckedAt: "2026-10-03",
    score: 115,
    reasonCodes: ["shadow-review-required"],
    website: { url: websiteUrl, checkedAt: "2026-10-03", evidence: [] },
    proposedCoach: coachProfile(websiteUrl),
  };
  const fixture = fakeStore({
    candidates: [previous],
    sources: [{ fullname: "t3_existing", websiteUrl, lastConfirmedAt: NOW.toISOString() }],
  });
  await runImport({
    environment: approvedEnvironment({
      REDDIT_IMPORT_MODE: "publish",
      REDDIT_PUBLICATION_APPROVED: "true",
    }),
    options: { dryRun: false, purge: false, help: false },
    now: NOW,
    storeFactory: () => fixture.store,
    clientFactory: () => ({
      postsByFullnames: async () => [coachPost({ name: "t3_existing" })],
    }),
    discover: async () => [],
    fetchWebsite: async (url) => ({ status: "fetched", url, html: "fixture" }),
    parseWebsite: readyAssessment,
  });

  const record = fixture.state.plans[0].candidates[0];
  assert.equal(record.status, "review");
  assert.equal(record.reviewCycles, 3);
});

test("temporary website outages retain twice, then downgrade a published profile", async () => {
  const websiteUrl = "https://db-pipeline-fixture.example/coaching";
  let record = {
    websiteUrl,
    status: "ready",
    reviewCycles: 4,
    firstCheckedAt: "2026-09-29",
    lastCheckedAt: "2026-09-30",
    score: 115,
    reasonCodes: [],
    website: { url: websiteUrl, checkedAt: "2026-09-30", evidence: [] },
    coach: coachProfile(websiteUrl),
  };

  for (const [index, date] of ["2026-10-01", "2026-10-02", "2026-10-03"].entries()) {
    const runTime = new Date(`${date}T12:00:00.000Z`);
    const fixture = fakeStore({
      candidates: [record],
      sources: [{ fullname: "t3_existing", websiteUrl, lastConfirmedAt: runTime.toISOString() }],
    });
    await runImport({
      environment: approvedEnvironment(),
      options: { dryRun: false, purge: false, help: false },
      now: runTime,
      storeFactory: () => fixture.store,
      clientFactory: () => ({
        postsByFullnames: async () => [coachPost({ name: "t3_existing" })],
      }),
      discover: async () => [],
      fetchWebsite: async () => ({
        status: "review",
        reasonCodes: ["website-unavailable"],
      }),
    });
    record = fixture.state.plans[0].candidates[0];
    assert.equal(record.status, index < 2 ? "ready" : "review");
    if (index < 2) assert.equal(record.transientFailures, index + 1);
  }
  assert.ok(!record.coach, "the third consecutive outage must leave the public view");
});

test("purge requires only its destructive-action gate and the private database", async () => {
  const fixture = fakeStore();
  let clientCalls = 0;
  const result = await runImport({
    environment: {
      REDDIT_IMPORT_DATABASE_URL: "postgresql://db.example/anystride_import_fixture",
      REDDIT_PURGE_APPROVED: "true",
    },
    options: { dryRun: false, purge: true, help: false },
    storeFactory: () => fixture.store,
    clientFactory: () => {
      clientCalls += 1;
      return {};
    },
  });

  assert.deepEqual(result, {
    mode: "purge",
    sourcesDeleted: 4,
    candidatesDeleted: 2,
  });
  assert.equal(fixture.state.purged, 1);
  assert.equal(clientCalls, 0);
});

test("the database purge preserves operator-managed domain suppressions", async () => {
  const database = new PGlite();
  const websiteUrl = "https://purged-candidate.example/coaching";
  try {
    await database.exec(SCHEMA_SQL);
    await database.query(
      `INSERT INTO reddit_import_private.suppressed_domains (domain_key)
       VALUES ('durable-suppression.example')`,
    );
    await database.query(
      `INSERT INTO reddit_import_private.candidates
         (website_url, status, review_cycles, review, updated_at)
       VALUES ($1, 'review', 1, '{}'::jsonb, CURRENT_TIMESTAMP)`,
      [websiteUrl],
    );
    await database.query(
      `INSERT INTO reddit_import_private.source_posts
         (fullname, website_url, first_seen_at, last_confirmed_at)
       VALUES ('t3_purgefixture', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [websiteUrl],
    );
    const store = createRedditCoachStore({
      pool: {
        async connect() {
          return {
            async query(text, values) {
              if (/pg_advisory_xact_lock/.test(text)) return { rows: [] };
              return database.query(text, values);
            },
            release() {},
          };
        },
      },
    });

    assert.deepEqual(await store.purge(), {
      sourcesDeleted: 1,
      candidatesDeleted: 1,
    });
    assert.equal(
      (await database.query("SELECT * FROM reddit_import_private.source_posts")).rows.length,
      0,
    );
    assert.equal(
      (await database.query("SELECT * FROM reddit_import_private.candidates")).rows.length,
      0,
    );
    assert.deepEqual(
      (await database.query(
        "SELECT domain_key FROM reddit_import_private.suppressed_domains",
      )).rows,
      [{ domain_key: "durable-suppression.example" }],
    );
  } finally {
    await database.close();
  }
});
