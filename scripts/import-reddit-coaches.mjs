#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  candidateFromPost,
  canonicalWebsiteUrl,
  coachFromWebsite,
  deduplicateRegistry,
  fetchCoachWebsite,
  registryRecord,
} from "./lib/reddit-coach-candidates.mjs";
import {
  createRedditClient,
  discoverRedditPosts,
  redditConfiguration,
} from "./lib/reddit-client.mjs";
import {
  createRedditCoachStore,
  redditStoreConfiguration,
} from "./lib/reddit-coach-store.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const curatedPath = join(root, "src/data/coaches.ts");
const vdotPath = join(root, "src/data/vdot-coaches.generated.ts");
const FULLNAME_PATTERN = /^t3_[a-z0-9]+$/i;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1_000;

export const REDDIT_LIFECYCLE_LIMITS = Object.freeze({
  ambiguousOmissionGraceHours: 24,
  duplicateRetentionDays: 7,
  reviewRetentionDays: 30,
  maximumActiveCandidates: 250,
  maximumSourcesPerCandidate: 3,
});

export const APPROVED_SUBREDDITS = [
  "running",
  "AdvancedRunning",
  "Marathon_Training",
  "ultrarunning",
  "trailrunning",
  "triathlon",
];

export const DISCOVERY_QUERIES = [
  '"running coach"',
  '"online coaching" runners',
  '"accepting athletes" coach',
  '"coaching spots" running',
];

function parsePositiveInteger(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseBoundedInteger(value, name, fallback, maximum) {
  const parsed = parsePositiveInteger(value, name, fallback);
  if (parsed > maximum) throw new Error(`${name} cannot exceed ${maximum}`);
  return parsed;
}

export function cliOptions(argv = process.argv.slice(2)) {
  const dryRun = argv.includes("--dry-run");
  const purge = argv.includes("--purge");
  const help = argv.includes("--help");
  const limitArgument = argv.find((argument) => argument.startsWith("--limit="));
  const unknown = argv.filter(
    (argument) =>
      !["--dry-run", "--purge", "--help"].includes(argument) &&
      !argument.startsWith("--limit="),
  );
  if (unknown.length > 0) throw new Error("Unknown Reddit import option");
  const limit = limitArgument
    ? parsePositiveInteger(limitArgument.split("=")[1], "--limit", undefined)
    : undefined;
  if (limit !== undefined && !dryRun) {
    throw new Error("--limit is only available with --dry-run so a partial scan is never stored");
  }
  if (purge && (dryRun || limit !== undefined)) {
    throw new Error("--purge cannot be combined with --dry-run or --limit");
  }
  return { dryRun, purge, help, limit };
}

function configuredSubreddits(environment) {
  const requested = (environment.REDDIT_IMPORT_SUBREDDITS || APPROVED_SUBREDDITS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (requested.length === 0) throw new Error("At least one approved subreddit is required");
  const allowed = new Set(APPROVED_SUBREDDITS.map((value) => value.toLowerCase()));
  for (const subreddit of requested) {
    if (!allowed.has(subreddit.toLowerCase())) {
      throw new Error(`Subreddit r/${subreddit} is outside the reviewed import allowlist`);
    }
  }
  return [...new Set(requested)];
}

function coachPairs(source) {
  const coaches = [];
  const pattern = /["']?slug["']?\s*:\s*"([^"]+)"\s*,\s*["']?name["']?\s*:\s*"([^"]+)"/g;
  for (const match of source.matchAll(pattern)) coaches.push({ slug: match[1], name: match[2] });
  return coaches;
}

async function existingCoachSummaries() {
  const [curatedSource, vdotSource] = await Promise.all([
    readFile(curatedPath, "utf8"),
    readFile(vdotPath, "utf8"),
  ]);
  const curatedStart = curatedSource.indexOf("const CURATED_COACHES");
  const curatedEnd = curatedSource.indexOf("\n];", curatedStart);
  const curated = coachPairs(curatedSource.slice(curatedStart, curatedEnd + 3));
  return [...curated, ...coachPairs(vdotSource)];
}

function statusCounts(records) {
  return records.reduce((counts, record) => {
    counts[record.status] = (counts[record.status] || 0) + 1;
    return counts;
  }, {});
}

function parsedTimestamp(value) {
  const milliseconds = Date.parse(value || "");
  return Number.isFinite(milliseconds) ? milliseconds : null;
}

function normalizedSuppressionDomain(value) {
  if (typeof value !== "string") throw new Error("Suppressed domain keys must be strings");
  let candidate = value.trim().toLowerCase().replace(/\.$/, "");
  if (candidate.startsWith("www.")) candidate = candidate.slice(4);
  let hostname;
  try {
    const parsed = new URL(`https://${candidate}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.port
    ) throw new Error();
    hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("Suppressed domain keys must be normalized hostnames");
  }
  const labels = hostname.split(".");
  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    labels.some(
      (label) =>
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error("Suppressed domain keys must be normalized hostnames");
  }
  return hostname;
}

function websiteHostname(value) {
  try {
    return new URL(value).hostname
      .toLowerCase()
      .replace(/\.$/, "")
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function websiteIsSuppressed(value, suppressedDomains) {
  const hostname = websiteHostname(value);
  if (!hostname) return false;
  for (const domain of suppressedDomains) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return true;
  }
  return false;
}

function recordIsSuppressed(record, suppressedDomains) {
  return [
    record?.websiteUrl,
    record?.website?.url,
    record?.coach?.link,
    record?.coach?.source?.url,
    record?.proposedCoach?.link,
    record?.proposedCoach?.source?.url,
  ].some((value) => value && websiteIsSuppressed(value, suppressedDomains));
}

function candidateLifecycleStart(record) {
  return (
    parsedTimestamp(record.nonReadySince) ??
    parsedTimestamp(record.firstCheckedAt) ??
    parsedTimestamp(record.lastCheckedAt)
  );
}

function candidateIsExpired(record, runMilliseconds) {
  if (record.status === "ready") return false;
  const retentionDays =
    record.status === "duplicate"
      ? REDDIT_LIFECYCLE_LIMITS.duplicateRetentionDays
      : REDDIT_LIFECYCLE_LIMITS.reviewRetentionDays;
  const startedAt = candidateLifecycleStart(record);
  return startedAt === null || runMilliseconds - startedAt >= retentionDays * DAY_MILLISECONDS;
}

function newestCandidateFirst(a, b) {
  return (
    (candidateLifecycleStart(b) ?? Number.NEGATIVE_INFINITY) -
      (candidateLifecycleStart(a) ?? Number.NEGATIVE_INFINITY) ||
    canonicalWebsiteUrl(a.websiteUrl).localeCompare(canonicalWebsiteUrl(b.websiteUrl))
  );
}

function limitSourcesPerCandidate(sources) {
  const grouped = new Map();
  for (const source of sources) {
    const websiteUrl = canonicalWebsiteUrl(source.websiteUrl);
    if (!websiteUrl) continue;
    const group = grouped.get(websiteUrl) || [];
    group.push({ ...source, websiteUrl });
    grouped.set(websiteUrl, group);
  }

  return [...grouped.values()]
    .flatMap((group) =>
      group
        .sort(
          (a, b) =>
            Number(Boolean(b.confirmed)) - Number(Boolean(a.confirmed)) ||
            (parsedTimestamp(b.confirmedAt || b.lastConfirmedAt) ?? 0) -
              (parsedTimestamp(a.confirmedAt || a.lastConfirmedAt) ?? 0) ||
            a.fullname.localeCompare(b.fullname),
        )
        .slice(0, REDDIT_LIFECYCLE_LIMITS.maximumSourcesPerCandidate),
    )
    .sort((a, b) => a.fullname.localeCompare(b.fullname));
}

function boundedSnapshot(snapshot, runMilliseconds, suppressedDomains) {
  const unsuppressedCandidates = snapshot.candidates.filter(
    (record) => !recordIsSuppressed(record, suppressedDomains),
  );
  const ready = unsuppressedCandidates.filter((record) => record.status === "ready");
  if (ready.length > REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates) {
    throw new Error(
      `Stored public Reddit listings exceed the safety limit of ${REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates}`,
    );
  }

  const nonReady = unsuppressedCandidates
    .filter((record) => record.status !== "ready")
    .filter((record) => !candidateIsExpired(record, runMilliseconds))
    .sort(newestCandidateFirst)
    .slice(0, REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates - ready.length);
  const candidates = [...ready, ...nonReady].sort((a, b) =>
    canonicalWebsiteUrl(a.websiteUrl).localeCompare(canonicalWebsiteUrl(b.websiteUrl)),
  );
  const websites = new Set(candidates.map((record) => canonicalWebsiteUrl(record.websiteUrl)));
  const eligibleSources = snapshot.sources.filter((source) =>
    websites.has(canonicalWebsiteUrl(source.websiteUrl)) &&
    !websiteIsSuppressed(source.websiteUrl, suppressedDomains),
  );
  const sources = limitSourcesPerCandidate(eligibleSources);

  return {
    candidates,
    sources,
    candidatesPruned: snapshot.candidates.length - candidates.length,
    sourcesPruned: snapshot.sources.length - sources.length,
    suppressedCandidates: snapshot.candidates.length - unsuppressedCandidates.length,
  };
}

function retainedOmittedSource(source, runAt, runMilliseconds) {
  const missingSince = parsedTimestamp(source.missingSince);
  if (
    missingSince !== null &&
    runMilliseconds - missingSince >=
      REDDIT_LIFECYCLE_LIMITS.ambiguousOmissionGraceHours * 60 * 60 * 1_000
  ) {
    return null;
  }
  if (parsedTimestamp(source.lastConfirmedAt) === null) {
    throw new Error("Stored Reddit source confirmation is invalid");
  }
  return {
    fullname: source.fullname,
    websiteUrl: canonicalWebsiteUrl(source.websiteUrl),
    confirmedAt: source.lastConfirmedAt,
    missingSince: source.missingSince || runAt,
    confirmed: false,
  };
}

function withLifecycleDates(records, previousByWebsite, checkedAt) {
  return records.map((record) => {
    const previous = previousByWebsite.get(canonicalWebsiteUrl(record.websiteUrl));
    if (record.status === "ready") {
      const ready = { ...record };
      delete ready.nonReadySince;
      return ready;
    }
    const continuedStatus = previous?.status === record.status;
    return {
      ...record,
      nonReadySince:
        (continuedStatus && (previous.nonReadySince || previous.firstCheckedAt)) || checkedAt,
    };
  });
}

function readyListingIdentities(records) {
  return new Set(
    records
      .filter((record) => record.status === "ready" && record.coach)
      .map(
        (record) =>
          `${canonicalWebsiteUrl(record.websiteUrl)}\u0000${record.coach.slug}`,
      ),
  );
}

function proposedCoachCount(records) {
  return records.filter((record) => record.status === "review" && record.proposedCoach).length;
}

function retainedTransientRecord(previous, assessment, checkedAt) {
  const isRetainable =
    previous &&
    ["ready", "review"].includes(previous.status) &&
    (previous.coach || previous.proposedCoach) &&
    assessment.status === "review" &&
    assessment.reasonCodes.some((reason) =>
      ["robots-unavailable", "website-unavailable"].includes(reason),
    );
  if (!isRetainable) return null;

  const alreadyRecordedToday = previous.lastAttemptAt === checkedAt;
  const transientFailures = alreadyRecordedToday
    ? previous.transientFailures || 1
    : (previous.transientFailures || 0) + 1;
  if (transientFailures > 2) return null;

  return {
    ...previous,
    lastAttemptAt: checkedAt,
    transientFailures,
    lastFailureReasonCodes: assessment.reasonCodes,
  };
}

function stableCoachIdentity(coach) {
  if (!coach || typeof coach !== "object") return null;
  let sourceHost;
  try {
    sourceHost = new URL(coach.source?.url || coach.link)
      .hostname
      .toLocaleLowerCase("en-US")
      .replace(/^www\./, "");
  } catch {
    return null;
  }
  const name = String(coach.name || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const slug = String(coach.slug || "").toLocaleLowerCase("en-US");
  if (!name || !slug || !sourceHost) return null;
  return `${name}\u0000${slug}\u0000${sourceHost}`;
}

async function assessWebsite({
  websiteUrl,
  previous,
  checkedAt,
  publicationMode,
  allowPromotion,
  fetchWebsite,
  parseWebsite,
  suppressedDomains,
}) {
  const fetched = await fetchWebsite(websiteUrl);
  if (fetched.status !== "fetched") {
    const retained = retainedTransientRecord(previous, fetched, checkedAt);
    if (retained) return retained;
    return registryRecord({
      websiteUrl,
      assessment: { ...fetched, score: previous?.score || 70 },
      previous,
      checkedAt,
    });
  }
  if (websiteIsSuppressed(fetched.url, suppressedDomains)) return null;

  let assessment;
  try {
    assessment = parseWebsite({
      html: fetched.html,
      url: fetched.url,
      checkedAt,
    });
  } catch {
    assessment = {
      status: "review",
      score: previous?.score || 70,
      reasonCodes: ["website-parse-failed"],
    };
  }
  const previousProfile = previous?.coach || previous?.proposedCoach;
  const identityChanged =
    assessment.status === "ready" &&
    previousProfile &&
    stableCoachIdentity(previousProfile) !== stableCoachIdentity(assessment.coach);
  const reviewPrevious = identityChanged ? undefined : previous;
  const reviewCycles =
    (reviewPrevious?.reviewCycles || 0) +
    (assessment.status === "ready" && reviewPrevious?.lastCheckedAt !== checkedAt ? 1 : 0);
  const publishReady =
    reviewPrevious?.status === "ready" ||
    (publicationMode === "publish" && allowPromotion && reviewCycles >= 4);
  const record = registryRecord({
    websiteUrl,
    assessment,
    previous: reviewPrevious,
    checkedAt,
    publishReady,
  });
  return recordIsSuppressed(record, suppressedDomains) ? null : record;
}

function qualifiedSource(post, now, lookbackHours) {
  if (!FULLNAME_PATTERN.test(post?.name || "")) return null;
  const candidate = candidateFromPost(post, { now, lookbackHours });
  if (!candidate || candidate.websiteUrls.length !== 1) return null;
  return { fullname: post.name, websiteUrl: candidate.websiteUrls[0] };
}

function safeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Import time must be a valid date");
  return date;
}

export async function runImport({
  environment = process.env,
  options = cliOptions(),
  clientFactory = createRedditClient,
  discover = discoverRedditPosts,
  storeFactory = createRedditCoachStore,
  fetchWebsite = fetchCoachWebsite,
  parseWebsite = coachFromWebsite,
  now = new Date(),
} = {}) {
  if (options.help) {
    return {
      help:
        "Usage: npm run import:reddit-coaches -- [--dry-run] [--limit=N] [--purge]\n" +
        "Normal imports require every written-approval gate documented in docs/reddit-coach-import.md. Purge requires only the private database and REDDIT_PURGE_APPROVED=true.",
    };
  }

  if (options.purge) {
    if (environment.REDDIT_PURGE_APPROVED !== "true") {
      throw new Error("REDDIT_PURGE_APPROVED=true is required to purge private Reddit import data");
    }
    const databaseConfiguration = redditStoreConfiguration(environment);
    const store = storeFactory(databaseConfiguration);
    try {
      await store.ensureSchema();
      const deleted = await store.purge();
      return { mode: "purge", ...deleted };
    } finally {
      await store.close?.();
    }
  }

  const configuration = redditConfiguration(environment);
  const publicationMode = environment.REDDIT_IMPORT_MODE || "review";
  if (!["review", "publish"].includes(publicationMode)) {
    throw new Error("REDDIT_IMPORT_MODE must be review or publish");
  }
  if (publicationMode === "publish" && environment.REDDIT_PUBLICATION_APPROVED !== "true") {
    throw new Error(
      "REDDIT_PUBLICATION_APPROVED=true is required before review candidates may enter the public directory",
    );
  }
  const databaseConfiguration = redditStoreConfiguration(environment);

  const runDate = safeDate(now);
  const runAt = runDate.toISOString();
  const checkedAt = runAt.slice(0, 10);
  const nowMilliseconds = runDate.getTime();
  const subreddits = configuredSubreddits(environment);
  const store = storeFactory(databaseConfiguration);
  try {
    await store.ensureSchema();
    const releaseRunLock = (await store.acquireRunLock?.()) || (async () => {});
    try {
      const snapshot = await store.loadSnapshot();
      const suppressedDomains = new Set(
        (snapshot.suppressedDomains || []).map(normalizedSuppressionDomain),
      );
      const bounded = boundedSnapshot(snapshot, nowMilliseconds, suppressedDomains);
      const previousRegistry = bounded.candidates;
      const previousByWebsite = new Map(
        previousRegistry.map((record) => [canonicalWebsiteUrl(record.websiteUrl), record]),
      );
      const client = clientFactory(configuration);

      // Revalidation is deliberately completed before any write. A failed API call
      // aborts the plan, so no source confirmation timestamp can be refreshed.
      const storedFullnames = bounded.sources.map((source) => source.fullname);
      const revalidatedPosts = await client.postsByFullnames(storedFullnames);
      const returnedFullnames = new Set(revalidatedPosts.map((post) => post?.name).filter(Boolean));
      const currentSources = new Map();
      const deferredSources = new Map();
      for (const post of revalidatedPosts) {
        const source = qualifiedSource(post, nowMilliseconds, Number.POSITIVE_INFINITY);
        if (source && !websiteIsSuppressed(source.websiteUrl, suppressedDomains)) {
          currentSources.set(source.fullname, source.websiteUrl);
        }
      }
      for (const source of bounded.sources) {
        // A returned but no-longer-qualifying post is an explicit deletion signal.
        // A post omitted from an otherwise successful bulk response is ambiguous,
        // so preserve it without refreshing its confirmation for one grace window.
        if (returnedFullnames.has(source.fullname)) continue;
        const retained = retainedOmittedSource(source, runAt, nowMilliseconds);
        if (retained) deferredSources.set(source.fullname, retained);
      }

      const posts = await discover(client, {
        subreddits,
        queries: DISCOVERY_QUERIES,
        maxPages: parseBoundedInteger(
          environment.REDDIT_IMPORT_MAX_PAGES,
          "REDDIT_IMPORT_MAX_PAGES",
          1,
          2,
        ),
        limit: 100,
      });
      const lookbackHours = parseBoundedInteger(
        environment.REDDIT_IMPORT_LOOKBACK_HOURS,
        "REDDIT_IMPORT_LOOKBACK_HOURS",
        72,
        168,
      );
      for (const post of posts) {
        const source = qualifiedSource(post, nowMilliseconds, lookbackHours);
        if (source && !websiteIsSuppressed(source.websiteUrl, suppressedDomains)) {
          currentSources.set(source.fullname, source.websiteUrl);
          deferredSources.delete(source.fullname);
        } else if (FULLNAME_PATTERN.test(post?.name || "")) {
          deferredSources.delete(post.name);
        }
      }

      const maximumNewCandidates = parseBoundedInteger(
        environment.REDDIT_IMPORT_MAX_CANDIDATES,
        "REDDIT_IMPORT_MAX_CANDIDATES",
        25,
        50,
      );
      const maximumAdditions = parseBoundedInteger(
        environment.REDDIT_IMPORT_MAX_ADDITIONS,
        "REDDIT_IMPORT_MAX_ADDITIONS",
        10,
        25,
      );
      const existingWebsites = new Set(previousByWebsite.keys());
      const availableCandidateSlots = Math.max(
        0,
        REDDIT_LIFECYCLE_LIMITS.maximumActiveCandidates - previousRegistry.length,
      );
      let newWebsites = [
        ...new Set(
          [...currentSources.values()]
            .map(canonicalWebsiteUrl)
            .filter(
              (websiteUrl) =>
                websiteUrl &&
                !websiteIsSuppressed(websiteUrl, suppressedDomains) &&
                !existingWebsites.has(websiteUrl),
            ),
        ),
      ]
        .sort()
        .slice(0, Math.min(maximumNewCandidates, availableCandidateSlots));
      if (options.limit !== undefined) newWebsites = newWebsites.slice(0, options.limit);
      const permittedWebsites = new Set([...existingWebsites, ...newWebsites]);
      for (const [fullname, websiteUrl] of currentSources) {
        if (!permittedWebsites.has(canonicalWebsiteUrl(websiteUrl))) {
          currentSources.delete(fullname);
        }
      }

      let sourcePlan = limitSourcesPerCandidate([
        ...[...currentSources].map(([fullname, websiteUrl]) => ({
          fullname,
          websiteUrl,
          confirmedAt: runAt,
          missingSince: null,
          confirmed: true,
        })),
        ...deferredSources.values(),
      ]).filter((source) => !websiteIsSuppressed(source.websiteUrl, suppressedDomains));
      const sourcesEligibleForAssessment = sourcePlan.filter((source) => source.confirmed);
      const websiteUrls = [
        ...new Set(sourcesEligibleForAssessment.map((source) => source.websiteUrl)),
      ]
        .filter(Boolean)
        .filter((websiteUrl) => !websiteIsSuppressed(websiteUrl, suppressedDomains))
        .filter((websiteUrl) => previousByWebsite.get(websiteUrl)?.status !== "duplicate")
        .sort();
      const assessed = [];
      const assessedWebsites = new Set();
      const suppressedDuringAssessment = new Set();
      let remainingPromotions = maximumAdditions;
      for (const websiteUrl of websiteUrls) {
        const previous = previousByWebsite.get(websiteUrl);
        const record = await assessWebsite({
          websiteUrl,
          previous,
          checkedAt,
          publicationMode,
          allowPromotion: remainingPromotions > 0,
          fetchWebsite,
          parseWebsite,
          suppressedDomains,
        });
        if (!record) {
          suppressedDuringAssessment.add(websiteUrl);
          continue;
        }
        assessed.push(record);
        assessedWebsites.add(websiteUrl);
        if (record.status === "ready" && previous?.status !== "ready") {
          remainingPromotions -= 1;
        }
      }
      if (suppressedDuringAssessment.size > 0) {
        sourcePlan = sourcePlan.filter(
          (source) => !suppressedDuringAssessment.has(source.websiteUrl),
        );
      }

      // An ambiguous Reddit omission must not advance a review cycle or trigger
      // a website fetch. Known duplicates also need no repeated website scan.
      for (const websiteUrl of new Set(sourcePlan.map((source) => source.websiteUrl))) {
        const previous = previousByWebsite.get(websiteUrl);
        if (previous && !assessedWebsites.has(websiteUrl)) assessed.push(previous);
      }

      const records = withLifecycleDates(
        deduplicateRegistry(assessed, await existingCoachSummaries()),
        previousByWebsite,
        checkedAt,
      );
      const confirmedSources = sourcePlan.filter((source) => source.confirmed);
      const previousReady = readyListingIdentities(snapshot.candidates);
      const currentReady = readyListingIdentities(records);
      const additions = [...currentReady].filter((identity) => !previousReady.has(identity)).length;
      const removals = [...previousReady].filter((identity) => !currentReady.has(identity)).length;
      if (additions > maximumAdditions) {
        throw new Error(
          `Import produced ${additions} new listings; the safety limit is ${maximumAdditions}`,
        );
      }

      const sources = sourcePlan
        .map((source) => ({
          fullname: source.fullname,
          websiteUrl: source.websiteUrl,
          confirmedAt: source.confirmedAt,
          missingSince: source.missingSince || null,
        }))
        .sort((a, b) => a.fullname.localeCompare(b.fullname));
      const storedNames = new Set(snapshot.sources.map((source) => source.fullname));
      const plannedNames = new Set(sources.map((source) => source.fullname));
      const candidateWebsites = new Set(
        records.map((record) => canonicalWebsiteUrl(record.websiteUrl)),
      );
      const previousWebsites = new Set(
        snapshot.candidates.map((record) => canonicalWebsiteUrl(record.websiteUrl)),
      );
      const summary = {
        checkedAt,
        approvedSubreddits: subreddits.length,
        storedSourcesRevalidated: storedFullnames.length,
        sourceAssociationsConfirmed: confirmedSources.length,
        sourceAssociationsDeferred: sources.length - confirmedSources.length,
        sourceAssociationsDeleted: [...storedNames].filter((name) => !plannedNames.has(name))
          .length,
        postsInspected: posts.length + revalidatedPosts.length,
        independentWebsitesDiscovered: new Set(
          confirmedSources.map((source) => source.websiteUrl),
        ).size,
        newWebsitesAssessed: newWebsites.length,
        suppressedDomainCount: suppressedDomains.size,
        suppressedCandidatesExcluded: bounded.suppressedCandidates,
        lifecycleCandidatesPruned: bounded.candidatesPruned,
        lifecycleSourcesPruned: bounded.sourcesPruned,
        candidatesDeleted: [...previousWebsites].filter(
          (websiteUrl) => !candidateWebsites.has(websiteUrl),
        ).length,
        status: statusCounts(records),
        proposalsAwaitingReview: proposedCoachCount(records),
        publicListings: currentReady.size,
        additions,
        removals,
        publicationMode,
      };
      if (options.dryRun) return summary;

      await store.applyPlan({ candidates: records, sources, appliedAt: runAt });
      return summary;
    } finally {
      await releaseRunLock();
    }
  } finally {
    await store.close?.();
  }
}

function safeErrorMessage(error) {
  return String(error?.message || "Reddit import failed")
    .replace(/t3_[a-z0-9]+/gi, "[source]")
    .replace(/https?:\/\/\S+/gi, "[url]");
}

async function main() {
  try {
    const options = cliOptions();
    const result = await runImport({ options });
    console.log(result.help || JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "failed", reason: safeErrorMessage(error) }));
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) await main();
