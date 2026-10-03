import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { Readable } from "node:stream";
import test from "node:test";

import {
  createRedditClient,
  discoverRedditPosts,
  redditConfiguration,
} from "../scripts/lib/reddit-client.mjs";
import {
  assertPublicDestination,
  candidateFromPost,
  canonicalWebsiteUrl,
  coachFromWebsite,
  deduplicateRegistry,
  externalWebsiteUrls,
  fetchCoachWebsite,
  pinnedRequestOptions,
  registryRecord,
  robotsAllows,
} from "../scripts/lib/reddit-coach-candidates.mjs";
import { runImport } from "../scripts/import-reddit-coaches.mjs";

const NOW = Date.UTC(2026, 9, 3, 12);
const PUBLIC_DNS = async () => [{ address: "93.184.216.34", family: 4 }];
const approvalEnvironment = (overrides = {}) => ({
  REDDIT_IMPORT_ENABLED: "true",
  REDDIT_APPROVAL_DATA_API: "true",
  REDDIT_APPROVAL_COMMERCIAL_USE: "true",
  REDDIT_APPROVAL_OFF_PLATFORM_LINKING: "true",
  REDDIT_APPROVAL_PUBLIC_DIRECTORY: "true",
  REDDIT_APPROVAL_DELETION_PROCESS: "true",
  REDDIT_APPROVAL_REFERENCE: "approval-fixture-123",
  REDDIT_APPROVAL_REVIEWER: "fixture-reviewer",
  REDDIT_CLIENT_ID: "fixture-client",
  REDDIT_CLIENT_SECRET: "fixture-secret",
  REDDIT_USER_AGENT: "script:anystride:v1.0 (by /u/fixturebot)",
  REDDIT_IMPORT_DATABASE_URL: "postgresql://localhost/fixture",
  ...overrides,
});

function jsonResponse(value, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function coachPost(overrides = {}) {
  return {
    id: "synthetic-post",
    name: "t3_synthetic",
    author: "fixture_coach",
    created_utc: NOW / 1_000,
    title: "I'm a running coach and I have coaching spots available",
    selftext:
      "I coach runners and am accepting new athletes for personalized online marathon coaching. " +
      "My coaching website is https://alexrun.example/coaching?utm_source=reddit&package=monthly.",
    ...overrides,
  };
}

function coachWebsiteHtml({ people = ["Alex Rivera"] } = {}) {
  const peopleJson = people.map((name) => ({
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: "Running Coach",
    description: "Online running and marathon coach",
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressRegion: "NY",
      addressCountry: "US",
    },
  }));
  return `<!doctype html>
    <html><head>
      <title>Alex Rivera | Running Coach</title>
      <script type="application/ld+json">${JSON.stringify(peopleJson)}</script>
    </head><body>
      <h1>Personalized coaching with Alex Rivera</h1>
      <p>Accepting athletes for online and in-person running coaching in New York.</p>
      <p>Every client receives an individualized training plan, one-to-one feedback, race
      strategy, and strength work. Services cover the 5K, 10K, half marathon, marathon,
      Boston qualifying, and injury-aware return to running.</p>
      <p>Work with me on a custom training plan built around your schedule, experience,
      goals, recovery, and upcoming races. Book a consultation to discuss coaching services.</p>
    </body></html>`;
}

function forbiddenRegistryKeys(value, path = "registry") {
  const forbidden = [];
  if (!value || typeof value !== "object") return forbidden;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (
      /^(?:author|username|subreddit|permalink|selftext|reddit(?:Id|Url|User|Username)?|post(?:Id|Title|Body|Text|Url)?)$/i.test(
        key,
      )
    ) {
      forbidden.push(nextPath);
    }
    forbidden.push(...forbiddenRegistryKeys(child, nextPath));
  }
  return forbidden;
}

test("Reddit configuration fails closed until every approved-use scope is recorded", () => {
  assert.throws(() => redditConfiguration({}), /import is disabled/i);
  assert.throws(
    () => redditConfiguration({ REDDIT_IMPORT_ENABLED: "true" }),
    /REDDIT_APPROVAL_DATA_API=true is required/i,
  );

  for (const gate of [
    "REDDIT_APPROVAL_DATA_API",
    "REDDIT_APPROVAL_COMMERCIAL_USE",
    "REDDIT_APPROVAL_OFF_PLATFORM_LINKING",
    "REDDIT_APPROVAL_PUBLIC_DIRECTORY",
    "REDDIT_APPROVAL_DELETION_PROCESS",
  ]) {
    assert.throws(
      () => redditConfiguration(approvalEnvironment({ [gate]: "false" })),
      new RegExp(`${gate}=true is required`),
    );
  }

  for (const missing of [
    "REDDIT_APPROVAL_REFERENCE",
    "REDDIT_APPROVAL_REVIEWER",
    "REDDIT_CLIENT_ID",
    "REDDIT_CLIENT_SECRET",
    "REDDIT_USER_AGENT",
  ]) {
    const environment = approvalEnvironment({ [missing]: " " });
    assert.throws(() => redditConfiguration(environment), new RegExp(`${missing} is required`));
  }

  assert.throws(
    () => redditConfiguration(approvalEnvironment({ REDDIT_USER_AGENT: "anystride" })),
    /must follow Reddit's/i,
  );
  assert.deepEqual(redditConfiguration(approvalEnvironment()), {
    approvalReference: "approval-fixture-123",
    approvalReviewer: "fixture-reviewer",
    clientId: "fixture-client",
    clientSecret: "fixture-secret",
    userAgent: "script:anystride:v1.0 (by /u/fixturebot)",
  });
});

test("publication has a separate explicit approval gate before discovery starts", async () => {
  let clientFactoryCalls = 0;
  await assert.rejects(
    runImport({
      environment: approvalEnvironment({
        REDDIT_IMPORT_MODE: "publish",
        REDDIT_PUBLICATION_APPROVED: "false",
      }),
      options: { dryRun: true, help: false },
      clientFactory: () => {
        clientFactoryCalls += 1;
        return {};
      },
      discover: async () => [],
    }),
    /REDDIT_PUBLICATION_APPROVED=true is required/i,
  );
  assert.equal(clientFactoryCalls, 0, "publication rejection must happen before API setup");
});

test("OAuth requests use client credentials, refresh once on 401, and honor Retry-After", async () => {
  const calls = [];
  const sleeps = [];
  let tokenRequests = 0;
  let apiRequests = 0;
  const client = createRedditClient(
    redditConfiguration(approvalEnvironment()),
    {
      fetchImpl: async (input, options) => {
        const url = String(input);
        calls.push({ url, options });
        if (url === "https://www.reddit.com/api/v1/access_token") {
          tokenRequests += 1;
          return jsonResponse({ access_token: `token-${tokenRequests}` });
        }
        apiRequests += 1;
        if (apiRequests === 1) return jsonResponse({}, { status: 401 });
        if (apiRequests === 2) {
          return jsonResponse({}, { status: 429, headers: { "retry-after": "2" } });
        }
        return jsonResponse(
          { data: { children: [{ data: { id: "one", name: "t3_one" } }], after: null } },
          { headers: { "x-ratelimit-remaining": "9" } },
        );
      },
      sleep: async (milliseconds) => sleeps.push(milliseconds),
    },
  );

  const result = await client.search({
    subreddit: "running",
    query: '"running coach"',
    limit: 500,
  });

  assert.deepEqual(result, { posts: [{ id: "one", name: "t3_one" }], after: undefined });
  assert.equal(tokenRequests, 2, "a 401 should discard and refresh the access token once");
  assert.equal(apiRequests, 3);
  assert.deepEqual(sleeps, [3_000]);

  const tokenCalls = calls.filter((call) => call.url.includes("/access_token"));
  assert.equal(tokenCalls[0].options.method, "POST");
  assert.match(tokenCalls[0].options.headers.Authorization, /^Basic /);
  assert.equal(tokenCalls[0].options.headers["User-Agent"], approvalEnvironment().REDDIT_USER_AGENT);
  assert.equal(tokenCalls[0].options.body.get("grant_type"), "client_credentials");
  assert.equal(tokenCalls[0].options.body.get("scope"), "read");

  const apiCalls = calls.filter((call) => call.url.includes("oauth.reddit.com"));
  assert.equal(apiCalls[0].options.headers.Authorization, "Bearer token-1");
  assert.equal(apiCalls[1].options.headers.Authorization, "Bearer token-2");
  assert.equal(apiCalls[2].options.headers.Authorization, "Bearer token-2");
  const searchUrl = new URL(apiCalls[2].url);
  assert.equal(searchUrl.pathname, "/r/running/search");
  assert.equal(searchUrl.searchParams.get("restrict_sr"), "true");
  assert.equal(searchUrl.searchParams.get("sort"), "new");
  assert.equal(searchUrl.searchParams.get("t"), "week");
  assert.equal(searchUrl.searchParams.get("limit"), "100");
});

test("API retries use bounded exponential fallback and missing rate headers are not zero", async () => {
  const sleeps = [];
  let apiRequests = 0;
  const client = createRedditClient(
    redditConfiguration(approvalEnvironment()),
    {
      fetchImpl: async (input) => {
        if (String(input).includes("/access_token")) {
          return jsonResponse({ access_token: "fixture-token" });
        }
        apiRequests += 1;
        if (apiRequests < 3) return jsonResponse({}, { status: 503 });
        return jsonResponse({ data: { children: [], after: null } });
      },
      sleep: async (milliseconds) => sleeps.push(milliseconds),
    },
  );

  assert.deepEqual(await client.search({ subreddit: "running", query: "coach" }), {
    posts: [],
    after: undefined,
  });
  assert.deepEqual(sleeps, [1_000, 2_000]);
});

test("API input validation and reported rate exhaustion fail without another request", async () => {
  let apiRequests = 0;
  const client = createRedditClient(redditConfiguration(approvalEnvironment()), {
    fetchImpl: async (input) => {
      if (String(input).includes("/access_token")) {
        return jsonResponse({ access_token: "fixture-token" });
      }
      apiRequests += 1;
      return jsonResponse(
        { data: { children: [], after: null } },
        {
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": "17.2",
          },
        },
      );
    },
    sleep: async () => assert.fail("successful exhausted responses must not be retried"),
  });

  await assert.rejects(
    client.search({ subreddit: "running-news", query: "coach" }),
    /Invalid subreddit/i,
  );
  await assert.rejects(client.search({ subreddit: "running", query: "x" }), /2 to 512/);
  await assert.rejects(
    client.request("https://attacker.example/steal"),
    /origin-relative path|oauth\.reddit\.com/i,
  );
  await assert.rejects(
    client.request("//attacker.example/steal"),
    /origin-relative path/i,
  );
  await assert.rejects(
    client.search({ subreddit: "running", query: "coach" }),
    /rate limit exhausted; resets in about 18 seconds/i,
  );
  assert.equal(apiRequests, 1);
});

test("discovery paginates within its bound and deduplicates posts across searches", async () => {
  const calls = [];
  const client = {
    async search(input) {
      calls.push(input);
      if (!input.after) {
        return {
          posts: [{ name: "t3_same" }, { name: `t3_unique${calls.length}` }],
          after: "next-page",
        };
      }
      return { posts: [{ name: "t3_same" }, { name: "t3_idonly" }], after: undefined };
    },
  };

  const posts = await discoverRedditPosts(client, {
    subreddits: ["running", "triathlon"],
    queries: ["coach"],
    maxPages: 2,
    limit: 25,
  });
  assert.equal(calls.length, 4);
  assert.equal(posts.filter((post) => post.name === "t3_same").length, 1);
  assert.equal(posts.filter((post) => post.name === "t3_idonly").length, 1);
});

test("candidate detection requires explicit self-promotion, an active service, and a direct site", () => {
  const candidate = candidateFromPost(coachPost(), { now: NOW, lookbackHours: 72 });
  assert.deepEqual(candidate, {
    websiteUrls: ["https://alexrun.example/coaching?package=monthly"],
    score: 70,
    signalIds: ["explicit-coach-identity", "active-coaching-service", "direct-website"],
  });

  assert.deepEqual(
    externalWebsiteUrls(
      coachPost({
        url_overridden_by_dest: "https://www.reddit.com/r/running/comments/synthetic",
        selftext:
          "Website https://alexrun.example/coaching?utm_campaign=launch and duplicate " +
          "https://alexrun.example/coaching?utm_campaign=launch.",
      }),
    ),
    ["https://alexrun.example/coaching"],
  );

  assert.equal(
    candidateFromPost(
      coachPost({
        title: "I'm a running coach sharing a training note",
        selftext: "I'm a running coach sharing training tips at https://alexrun.example/blog.",
      }),
      { now: NOW },
    ),
    null,
    "identity without an offered service is not a lead",
  );
  assert.equal(
    candidateFromPost(
      coachPost({
        selftext:
          "I'm a running coach accepting athletes. Work with me at https://instagram.com/fixture_coach.",
      }),
      { now: NOW },
    ),
    null,
    "a social profile is not a direct coaching website",
  );
});

test("candidate detection retains only an explicitly owned site when a post has several links", () => {
  const explicit = candidateFromPost(
    coachPost({
      selftext:
        "I'm a running coach accepting new athletes. My coaching website is " +
        "https://alexrun.example/coaching. A useful calculator is https://tools.example/pace.",
    }),
    { now: NOW },
  );
  assert.deepEqual(explicit.websiteUrls, ["https://alexrun.example/coaching"]);

  const ambiguous = candidateFromPost(
    coachPost({
      selftext:
        "I'm a running coach accepting new athletes. Work with me and read more at " +
        "https://alexrun.example/coaching or https://anothercoach.example/services.",
    }),
    { now: NOW },
  );
  assert.equal(ambiguous, null, "multiple unattributed links must not become coach leads");

  const soleUnattributed = candidateFromPost(
    coachPost({
      selftext:
        "I'm a running coach accepting new athletes. Here is a useful coaching resource: " +
        "https://anothercoach.example/services.",
    }),
    { now: NOW },
  );
  assert.equal(
    soleUnattributed,
    null,
    "a sole external link must not be treated as the poster's website without ownership language",
  );
});

test("candidate detection rejects requests, complaints, unrelated coaches, unsafe posts, and stale posts", () => {
  const rejected = [
    coachPost({ title: "Looking for a running coach", selftext: coachPost().selftext }),
    coachPost({ title: "Warning: avoid this coach", selftext: coachPost().selftext }),
    coachPost({ title: "Hiring a running coach", selftext: coachPost().selftext }),
    coachPost({ title: "I'm a football coach", selftext: coachPost().selftext }),
    coachPost({ selftext: `${coachPost().selftext} I provide youth-only coaching.` }),
    coachPost({ stickied: true }),
    coachPost({ over_18: true }),
    coachPost({ quarantine: true }),
    coachPost({ removed_by_category: "moderator" }),
    coachPost({ author: "[deleted]" }),
    coachPost({ selftext: "[removed]" }),
    coachPost({ created_utc: (NOW - 73 * 60 * 60 * 1_000) / 1_000 }),
  ];
  for (const [index, post] of rejected.entries()) {
    assert.equal(candidateFromPost(post, { now: NOW, lookbackHours: 72 }), null, `fixture ${index}`);
  }
});

test("URL handling strips tracking and rejects private, credentialed, non-web, and intermediary URLs", async () => {
  assert.equal(
    canonicalWebsiteUrl("https://www.alexrun.example/coaching/?utm_source=reddit&plan=monthly#apply"),
    "https://alexrun.example/coaching?plan=monthly",
  );
  assert.equal(
    canonicalWebsiteUrl("https://203.0.114.1/coaching"),
    "https://203.0.114.1/coaching",
    "globally routable neighbors of documentation ranges must remain eligible",
  );

  for (const url of [
    "http://localhost/coaching",
    "http://127.0.0.1/coaching",
    "http://[::1]/coaching",
    "http://[::7f00:1]/coaching",
    "http://[::ffff:7f00:1]/coaching",
    "http://[64:ff9b::7f00:1]/coaching",
    "http://[64:ff9b:1::a00:1]/coaching",
    "http://[2002:7f00:1::]/coaching",
    "http://[2001:0:4136:e378::]/coaching",
    "http://10.0.0.4/coaching",
    "https://user:password@alexrun.example/coaching",
    "https://alexrun.example:8443/coaching",
    "ftp://alexrun.example/coaching",
    "https://reddit.com/r/running",
    "https://reddit.com./r/running",
    "http://localhost./coaching",
    "https://linktr.ee/fixturecoach",
    "https://teamrunrun.com/coach/fixture",
    "https://alexrun.example/brochure.pdf",
  ]) {
    assert.equal(canonicalWebsiteUrl(url), null, url);
  }

  await assert.rejects(
    assertPublicDestination("https://alexrun.example/coaching", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.7", family: 4 },
    ]),
    /private or reserved network/i,
  );
  for (const address of [
    "::7f00:1",
    "::ffff:7f00:1",
    "64:ff9b::7f00:1",
    "64:ff9b:1::a00:1",
    "2002:7f00:1::",
    "2001:0000:4136:e378::",
  ]) {
    await assert.rejects(
      assertPublicDestination("https://alexrun.example/coaching", async () => [
        { address, family: 6 },
      ]),
      /private or reserved network/i,
      address,
    );
  }
  assert.equal(
    await assertPublicDestination("https://alexrun.example/coaching", PUBLIC_DNS),
    "https://alexrun.example/coaching",
  );
  assert.equal(
    await assertPublicDestination("https://alexrun.example/coaching", async () => [
      { address: "2606:4700:4700::1111", family: 6 },
    ]),
    "https://alexrun.example/coaching",
  );

  const destination = {
    url: "https://alexrun.example/coaching",
    parsed: new URL("https://alexrun.example/coaching"),
    address: "93.184.216.34",
    family: 4,
  };
  const options = pinnedRequestOptions(destination);
  assert.equal(options.agent, false);
  assert.equal(options.headers.Host, "alexrun.example");
  assert.equal(options.servername, "alexrun.example");
  await new Promise((resolve, reject) => {
    options.lookup("alexrun.example", {}, (error, address, family) => {
      if (error) return reject(error);
      assert.equal(address, "93.184.216.34");
      assert.equal(family, 4);
      resolve();
    });
  });
});

test("robots rules use the most specific matching path", () => {
  const robots = `
    User-agent: *
    Disallow: /private
    Allow: /private/public
    Disallow: /temporary*
  `;
  assert.equal(robotsAllows(robots, "/coaching"), true);
  assert.equal(robotsAllows(robots, "/private/profile"), false);
  assert.equal(robotsAllows(robots, "/private/public/coach"), true);
  assert.equal(robotsAllows(robots, "/temporary-offer"), false);

  const specificBotRules = `
    User-agent: *
    Allow: /
    User-agent: AnystrideCoachDirectoryBot
    Disallow: /
  `;
  assert.equal(
    robotsAllows(specificBotRules, "/coaching"),
    false,
    "a bot-specific group must take precedence over the wildcard group",
  );

  const substringProductToken = `
    User-agent: *
    Allow: /
    User-agent: CoachDirectoryBot
    Disallow: /
  `;
  assert.equal(
    robotsAllows(substringProductToken, "/coaching"),
    true,
    "a substring of the crawler product token must not select a bot-specific group",
  );

  const tiedRules = `
    User-agent: AnystrideCoachDirectoryBot
    Disallow: /coaching
    Allow: /coaching
  `;
  assert.equal(robotsAllows(tiedRules, "/coaching"), true, "Allow wins equal-length ties");

  const encodedPathRules = `
    User-agent: AnystrideCoachDirectoryBot
    Disallow: /private/~user
  `;
  assert.equal(
    robotsAllows(encodedPathRules, "/private/%7Euser/profile"),
    false,
    "percent-encoded unreserved octets must not bypass a disallow rule",
  );
});

test("website fetching respects robots, tolerates a missing robots file, and rechecks redirects", async () => {
  let blockedRequests = 0;
  const blockedDestination = await fetchCoachWebsite("http://127.0.0.1/coaching", {
    dnsLookup: PUBLIC_DNS,
    fetchImpl: async () => {
      blockedRequests += 1;
      return new Response("should not be fetched");
    },
  });
  assert.deepEqual(blockedDestination, {
    status: "review",
    reasonCodes: ["website-destination-blocked"],
  });
  assert.equal(blockedRequests, 0);

  const disallowedCalls = [];
  const disallowed = await fetchCoachWebsite("https://alexrun.example/private/profile", {
    dnsLookup: PUBLIC_DNS,
    fetchImpl: async (input) => {
      disallowedCalls.push(String(input));
      return new Response("User-agent: *\nDisallow: /private", {
        headers: { "content-type": "text/plain" },
      });
    },
  });
  assert.deepEqual(disallowed, { status: "review", reasonCodes: ["robots-disallowed"] });
  assert.equal(disallowedCalls.length, 1, "a disallowed page must never be fetched");

  const missingRobots = await fetchCoachWebsite("https://alexrun.example/coaching", {
    dnsLookup: PUBLIC_DNS,
    fetchImpl: async (input) =>
      String(input).endsWith("/robots.txt")
        ? new Response("missing", { status: 404 })
        : new Response(coachWebsiteHtml(), { headers: { "content-type": "text/html" } }),
  });
  assert.equal(missingRobots.status, "fetched");
  assert.equal(missingRobots.url, "https://alexrun.example/coaching");

  const unavailableRobots = await fetchCoachWebsite("https://alexrun.example/coaching", {
    dnsLookup: PUBLIC_DNS,
    fetchImpl: async () => new Response("unavailable", { status: 503 }),
  });
  assert.deepEqual(unavailableRobots, {
    status: "review",
    reasonCodes: ["robots-unavailable"],
  });

  let requests = 0;
  const privateRedirect = await fetchCoachWebsite("https://alexrun.example/coaching", {
    dnsLookup: async (hostname) => {
      if (hostname === "alexrun.example") return PUBLIC_DNS();
      return [{ address: "127.0.0.1", family: 4 }];
    },
    fetchImpl: async (input) => {
      requests += 1;
      if (String(input).endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/internal" },
      });
    },
  });
  assert.deepEqual(privateRedirect, {
    status: "review",
    reasonCodes: ["website-unavailable"],
  });
  assert.equal(requests, 2, "the private redirect target must be blocked before it is requested");
});

test("website fetching applies robots rules again after every redirect", async () => {
  const calls = [];
  const result = await fetchCoachWebsite("https://alexrun.example/start", {
    dnsLookup: PUBLIC_DNS,
    fetchImpl: async (input) => {
      const url = String(input);
      calls.push(url);
      if (url === "https://alexrun.example/robots.txt") {
        return new Response("User-agent: *\nAllow: /", {
          headers: { "content-type": "text/plain" },
        });
      }
      if (url === "https://alexrun.example/start") {
        return new Response(null, {
          status: 302,
          headers: { location: "https://redirected.example/private/coach" },
        });
      }
      if (url === "https://redirected.example/robots.txt") {
        return new Response("User-agent: *\nDisallow: /private", {
          headers: { "content-type": "text/plain" },
        });
      }
      assert.fail(`redirect target was fetched despite robots: ${url}`);
    },
  });
  assert.deepEqual(result, { status: "review", reasonCodes: ["robots-disallowed"] });
  assert.deepEqual(calls, [
    "https://alexrun.example/robots.txt",
    "https://alexrun.example/start",
    "https://redirected.example/robots.txt",
  ]);
});

test("production HTTP path pins the vetted address and aborts an oversized streamed body", async () => {
  const observed = [];
  const requestImpl = (url, options, callback) => {
    const request = new EventEmitter();
    request.end = () => {
      options.lookup(url.hostname, {}, (error, address, family) => {
        assert.ifError(error);
        observed.push({
          url: url.href,
          address,
          family,
          host: options.headers.Host,
          servername: options.servername,
        });
      });
      queueMicrotask(() => {
        const isRobots = url.pathname === "/robots.txt";
        const response = Readable.from(
          isRobots ? [Buffer.from("missing")] : [Buffer.alloc(40, "a"), Buffer.alloc(40, "b")],
        );
        response.statusCode = isRobots ? 404 : 200;
        response.headers = isRobots
          ? { "content-type": "text/plain" }
          : { "content-type": "text/html" };
        callback(response);
      });
    };
    request.destroy = () => {};
    return request;
  };

  const result = await fetchCoachWebsite("https://alexrun.example/coaching", {
    dnsLookup: PUBLIC_DNS,
    requestImpl,
    maxBytes: 64,
  });
  assert.deepEqual(result, { status: "review", reasonCodes: ["website-unavailable"] });
  assert.equal(observed.length, 2);
  for (const request of observed) {
    assert.equal(request.address, "93.184.216.34");
    assert.equal(request.family, 4);
    assert.equal(request.host, "alexrun.example");
    assert.equal(request.servername, "alexrun.example");
  }
});

test("website enrichment requires one public identity and emits only factual directory fields", () => {
  const assessment = coachFromWebsite({
    html: coachWebsiteHtml(),
    url: "https://alexrun.example/coaching?utm_source=fixture",
    checkedAt: "2026-10-03",
  });
  assert.equal(assessment.status, "ready");
  assert.ok(assessment.score >= 100);
  assert.deepEqual(assessment.reasonCodes, []);
  assert.equal(assessment.coach.name, "Alex Rivera");
  assert.equal(assessment.coach.city, "New York");
  assert.equal(assessment.coach.location, "New York, NY, US");
  assert.equal(assessment.coach.format, "hybrid");
  assert.ok(assessment.coach.focus.includes("marathon"));
  assert.ok(assessment.coach.focus.includes("injury-aware"));
  assert.ok(assessment.coach.specialties.includes("Personalized training"));
  assert.equal(assessment.coach.link, "https://alexrun.example/coaching");
  assert.deepEqual(assessment.coach.source, {
    name: "alexrun.example",
    url: "https://alexrun.example/coaching",
  });
  assert.equal(assessment.coach.sourceCheckedAt, "2026-10-03");
  assert.equal(assessment.coach.verified, false);
  assert.equal("discoveredFrom" in assessment.coach, false);
  assert.equal(
    assessment.coach.bio[0],
    "Alex Rivera offers online and in-person coaching focused on personalized training, strength training and injury-aware training.",
  );
  assert.doesNotMatch(assessment.coach.bio.join(" "), /public website describes/i);

  const ambiguous = coachFromWebsite({
    html: coachWebsiteHtml({ people: ["Alex Rivera", "Jamie Miles"] }),
    url: "https://alexrun.example/coaching",
    checkedAt: "2026-10-03",
  });
  assert.deepEqual(ambiguous.reasonCodes, ["multiple-coaches-on-website"]);

  const unrelated = coachFromWebsite({
    html: `<html><title>Alex Rivera</title><body>${"A generic personal website. ".repeat(20)}</body></html>`,
    url: "https://alexrun.example",
    checkedAt: "2026-10-03",
  });
  assert.deepEqual(unrelated.reasonCodes, ["website-not-running-coaching"]);
});

test("website enrichment requires explicit format evidence and preserves JSON-LD locality", () => {
  const page = ({ locality, service }) => `<!doctype html><html><head>
    <title>Alex Rivera | Running Coach</title>
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Alex Rivera",
      jobTitle: "Running Coach",
      ...(locality
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: locality,
              addressRegion: "CO",
              addressCountry: "US",
            },
          }
        : {}),
    })}</script></head><body>
    <h1>Personalized coaching with Alex Rivera</h1>
    <p>${service}</p>
    <p>${"Every athlete receives an individualized training plan, feedback, and a custom coaching service. ".repeat(8)}</p>
    <p>Accepting athletes now. Apply to work with Alex on a personalized training plan.</p>
    </body></html>`;

  const denver = coachFromWebsite({
    html: page({
      locality: "Denver",
      service: "In-person running coaching is available for runners in Denver.",
    }),
    url: "https://alexrun.example/coaching",
    checkedAt: "2026-10-03",
  });
  assert.equal(denver.status, "ready");
  assert.equal(denver.coach.format, "in-person");
  assert.equal(denver.coach.city, "Denver");
  assert.equal(denver.coach.location, "Denver, CO, US");

  const formatUnknown = coachFromWebsite({
    html: page({
      locality: "Denver",
      service: "Running coaching is available for marathon runners.",
    }),
    url: "https://alexrun.example/coaching",
    checkedAt: "2026-10-03",
  });
  assert.deepEqual(formatUnknown.reasonCodes, ["website-format-not-confirmed"]);
  assert.equal("coach" in formatUnknown, false);

  const locationUnknown = coachFromWebsite({
    html: page({
      service: "In-person running coaching is available for marathon runners.",
    }),
    url: "https://alexrun.example/coaching",
    checkedAt: "2026-10-03",
  });
  assert.deepEqual(locationUnknown.reasonCodes, ["website-location-not-confirmed"]);
  assert.equal("coach" in locationUnknown, false);
});

test("website enrichment treats malformed numeric entities as untrusted text", () => {
  const assessment = coachFromWebsite({
    html: coachWebsiteHtml().replace(
      "Personalized online and in-person running coaching",
      "Personalized online and in-person running coaching &#99999999999; &#xD800;",
    ),
    url: "https://alexrun.example/coaching",
    checkedAt: "2026-10-03",
  });
  assert.equal(assessment.status, "ready");
  assert.equal(assessment.coach.name, "Alex Rivera");
});

test("website enrichment never treats a non-coaching Person node as the coach", () => {
  const html = `<!doctype html><html><head><title>Fast Lane Running Coaching</title>
    <script type="application/ld+json">${JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: "Jordan Webwriter",
        jobTitle: "Website editor",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Fast Lane Running Coaching",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Boston",
          addressRegion: "MA",
          addressCountry: "US",
        },
      },
    ])}</script></head><body>
    <h1>Fast Lane Running Coaching</h1>
    <p>Accepting athletes for personalized online marathon coaching in Boston.</p>
    <p>${"Every client receives an individualized training plan and coaching service. ".repeat(8)}</p>
    </body></html>`;
  const assessment = coachFromWebsite({
    html,
    url: "https://fastlane.example/coaching",
    checkedAt: "2026-10-03",
  });
  assert.equal(assessment.status, "ready");
  assert.equal(assessment.coach.name, "Fast Lane Running Coaching");
  assert.notEqual(assessment.coach.name, "Jordan Webwriter");
});

test("registry records stay in shadow review until explicitly publishable and retain no Reddit data", () => {
  const assessment = {
    ...coachFromWebsite({
      html: coachWebsiteHtml(),
      url: "https://alexrun.example/coaching",
      checkedAt: "2026-10-03",
    }),
    author: "fixture_coach",
    subreddit: "running",
    postTitle: "synthetic private post title",
    permalink: "/r/running/comments/synthetic",
    selftext: "synthetic private post body",
  };
  const previous = { reviewCycles: 3, firstCheckedAt: "2026-09-30" };
  const proposed = registryRecord({
    websiteUrl: "https://alexrun.example/coaching",
    assessment,
    previous,
    checkedAt: "2026-10-03",
  });
  assert.equal(proposed.status, "review");
  assert.equal(proposed.reviewCycles, 4);
  assert.deepEqual(proposed.reasonCodes, ["shadow-review-required"]);
  assert.equal("coach" in proposed, false);
  assert.equal(proposed.proposedCoach.name, "Alex Rivera");
  assert.deepEqual(forbiddenRegistryKeys(proposed), []);
  assert.doesNotMatch(JSON.stringify(proposed), /fixture_coach|synthetic private post/i);

  const published = registryRecord({
    websiteUrl: "https://alexrun.example/coaching",
    assessment,
    previous,
    checkedAt: "2026-10-03",
    publishReady: true,
  });
  assert.equal(published.status, "ready");
  assert.equal(published.coach.name, "Alex Rivera");
  assert.equal("proposedCoach" in published, false);
  assert.deepEqual(forbiddenRegistryKeys(published), []);
});

test("registry deduplication gives existing Anystride profiles precedence", () => {
  const ready = registryRecord({
    websiteUrl: "https://alexrun.example/coaching",
    assessment: coachFromWebsite({
      html: coachWebsiteHtml(),
      url: "https://alexrun.example/coaching",
      checkedAt: "2026-10-03",
    }),
    checkedAt: "2026-10-03",
    publishReady: true,
  });
  const [duplicate] = deduplicateRegistry([ready], [
    { slug: "curated-alex", name: "Álex Rivera" },
  ]);
  assert.equal(duplicate.status, "duplicate");
  assert.deepEqual(duplicate.reasonCodes, ["already-listed"]);
  assert.equal("coach" in duplicate, false);
});

test("Reddit source associations are kept out of checked-in coach data", () => {
  for (const path of [
    "../src/data/reddit-coach-registry.generated.json",
    "../src/data/reddit-coaches.generated.ts",
  ]) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, `${path} must not exist`);
  }
  const coachesSource = readFileSync(
    new URL("../src/data/coaches.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(coachesSource, /REDDIT_COACHES|reddit-coaches\.generated/);

  const publicStoreSource = readFileSync(
    new URL("../src/lib/discovered-coach-store.ts", import.meta.url),
    "utf8",
  );
  assert.match(publicStoreSource, /COACH_DISCOVERY_DATABASE_URL/);
  assert.match(publicStoreSource, /SELECT coach FROM \$\{DIRECTORY_VIEW\}/);
  assert.doesNotMatch(publicStoreSource, /source_posts|fullname|post_(?:id|title|body)/i);
});

test("scheduled discovery is exact-scope gated and writes only to private state", () => {
  const workflow = readFileSync(
    new URL("../.github/workflows/reddit-coach-discovery.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /schedule:\s*\n\s*- cron:/);
  assert.match(workflow, /workflow_dispatch:/);
  for (const gate of [
    "DATA_API",
    "COMMERCIAL_USE",
    "OFF_PLATFORM_LINKING",
    "PUBLIC_DIRECTORY",
    "DELETION_PROCESS",
  ]) {
    assert.match(workflow, new RegExp(`vars\\.REDDIT_APPROVAL_${gate} == 'true'`));
    assert.match(
      workflow,
      new RegExp(`REDDIT_APPROVAL_${gate}: \\$\\{\\{ vars\\.REDDIT_APPROVAL_${gate} \\}\\}`),
    );
  }
  assert.match(workflow, /REDDIT_APPROVAL_REFERENCE: \$\{\{ secrets\.REDDIT_APPROVAL_REFERENCE \}\}/);
  assert.match(workflow, /REDDIT_APPROVAL_REVIEWER: \$\{\{ secrets\.REDDIT_APPROVAL_REVIEWER \}\}/);
  assert.match(workflow, /REDDIT_IMPORT_DATABASE_URL: \$\{\{ secrets\.REDDIT_IMPORT_DATABASE_URL \}\}/);
  assert.match(workflow, /permissions:\s*\n\s*contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(workflow, /contents: write|pull-requests: write|git push|git commit|gh pr|reddit-coaches\.generated|reddit-coach-registry/);

  const importIndex = workflow.indexOf("npm run import:reddit-coaches");
  const testIndex = workflow.indexOf("npm test");
  assert.ok(testIndex >= 0 && testIndex < importIndex, "verification must finish before DB mutation");

  const installStep = workflow.slice(
    workflow.indexOf("- name: Install dependencies"),
    workflow.indexOf("- name: Verify the importer"),
  );
  const verifyStep = workflow.slice(
    workflow.indexOf("- name: Verify the importer"),
    workflow.indexOf("- name: Discover, revalidate"),
  );
  assert.doesNotMatch(installStep + verifyStep, /secrets\.|REDDIT_CLIENT_SECRET|DATABASE_URL/);
});
