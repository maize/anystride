const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API_ORIGIN = "https://oauth.reddit.com";
const USER_AGENT_PATTERN = /^(?:web|script):[a-z0-9._-]+:v?\d+(?:\.\d+){1,2} \(by \/u\/[A-Za-z0-9_-]{3,20}\)$/i;
const APPROVAL_GATES = [
  "DATA_API",
  "COMMERCIAL_USE",
  "OFF_PLATFORM_LINKING",
  "PUBLIC_DIRECTORY",
  "DELETION_PROCESS",
];
const REDDIT_FULLNAME_PATTERN = /^t3_[a-z0-9]+$/i;

const defaultSleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function required(value, name) {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function redditConfiguration(environment = process.env) {
  if (environment.REDDIT_IMPORT_ENABLED !== "true") {
    throw new Error(
      "Reddit import is disabled. Set REDDIT_IMPORT_ENABLED=true only after Reddit approves this use case.",
    );
  }
  for (const gate of APPROVAL_GATES) {
    const variable = `REDDIT_APPROVAL_${gate}`;
    if (environment[variable] !== "true") {
      throw new Error(`${variable}=true is required before Reddit data may be processed`);
    }
  }

  const approvalReference = required(
    environment.REDDIT_APPROVAL_REFERENCE,
    "REDDIT_APPROVAL_REFERENCE",
  );
  const approvalReviewer = required(
    environment.REDDIT_APPROVAL_REVIEWER,
    "REDDIT_APPROVAL_REVIEWER",
  );
  const clientId = required(environment.REDDIT_CLIENT_ID, "REDDIT_CLIENT_ID");
  const clientSecret = required(
    environment.REDDIT_CLIENT_SECRET,
    "REDDIT_CLIENT_SECRET",
  );
  const userAgent = required(environment.REDDIT_USER_AGENT, "REDDIT_USER_AGENT");
  if (!USER_AGENT_PATTERN.test(userAgent)) {
    throw new Error(
      "REDDIT_USER_AGENT must follow Reddit's platform:app-id:version (by /u/account) format.",
    );
  }

  return { approvalReference, approvalReviewer, clientId, clientSecret, userAgent };
}

function retryDelay(response, attempt) {
  const retryAfterHeader = response.headers.get("retry-after");
  const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter >= 0) {
    return Math.min((retryAfter + 1) * 1_000, 60_000);
  }
  return Math.min(1_000 * 2 ** attempt, 30_000);
}

function safeApiError(response) {
  return new Error(`Reddit API request failed with status ${response.status}`);
}

export function createRedditClient(
  configuration,
  { fetchImpl = fetch, sleep = defaultSleep } = {},
) {
  const { clientId, clientSecret, userAgent } = configuration;
  let accessToken;

  async function token() {
    if (accessToken) return accessToken;
    const authorization = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      redirect: "error",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "read" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw safeApiError(response);
    const payload = await response.json();
    if (typeof payload.access_token !== "string" || !payload.access_token) {
      throw new Error("Reddit OAuth response did not include an access token");
    }
    accessToken = payload.access_token;
    return accessToken;
  }

  async function request(pathname, searchParams = {}) {
    if (
      typeof pathname !== "string" ||
      !pathname.startsWith("/") ||
      pathname.startsWith("//")
    ) {
      throw new Error("Reddit API requests require an origin-relative path");
    }
    const url = new URL(pathname, API_ORIGIN);
    if (url.origin !== API_ORIGIN || url.protocol !== "https:") {
      throw new Error("Reddit API requests must stay on oauth.reddit.com");
    }
    for (const [name, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(name, String(value));
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await fetchImpl(url, {
        redirect: "error",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${await token()}`,
          "User-Agent": userAgent,
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (response.status === 401 && attempt === 0) {
        accessToken = undefined;
        continue;
      }
      if (response.status === 429 || response.status >= 500) {
        if (attempt === 2) throw safeApiError(response);
        await sleep(retryDelay(response, attempt));
        continue;
      }
      if (!response.ok) throw safeApiError(response);

      const remainingHeader = response.headers.get("x-ratelimit-remaining");
      const remaining = remainingHeader === null ? Number.NaN : Number(remainingHeader);
      if (Number.isFinite(remaining) && remaining < 1) {
        const resetHeader = response.headers.get("x-ratelimit-reset");
        const reset = resetHeader === null ? Number.NaN : Number(resetHeader);
        throw new Error(
          `Reddit API rate limit exhausted${Number.isFinite(reset) ? `; resets in about ${Math.ceil(reset)} seconds` : ""}`,
        );
      }
      return response.json();
    }
    throw new Error("Reddit API request exhausted its retry budget");
  }

  async function search({ subreddit, query, after, limit = 100 }) {
    if (!/^[A-Za-z0-9_]{2,30}$/.test(subreddit)) {
      throw new Error(`Invalid subreddit name: ${subreddit}`);
    }
    if (typeof query !== "string" || query.length < 2 || query.length > 512) {
      throw new Error("Reddit search query must contain 2 to 512 characters");
    }
    const payload = await request(`/r/${subreddit}/search`, {
      q: query,
      restrict_sr: "true",
      sort: "new",
      t: "week",
      type: "link",
      raw_json: 1,
      limit: Math.min(Math.max(limit, 1), 100),
      after,
    });
    return {
      posts: Array.isArray(payload?.data?.children)
        ? payload.data.children.map((child) => child?.data).filter(Boolean)
        : [],
      after: typeof payload?.data?.after === "string" ? payload.data.after : undefined,
    };
  }

  async function postsByFullnames(fullnames) {
    if (!Array.isArray(fullnames)) {
      throw new Error("Reddit source fullnames must be provided as an array");
    }
    const unique = [...new Set(fullnames)];
    if (unique.some((fullname) => !REDDIT_FULLNAME_PATTERN.test(fullname))) {
      throw new Error("Reddit source fullnames must be link fullnames");
    }

    const posts = [];
    for (let offset = 0; offset < unique.length; offset += 100) {
      const batch = unique.slice(offset, offset + 100);
      const payload = await request("/api/info", {
        id: batch.join(","),
        raw_json: 1,
      });
      const requested = new Set(batch);
      for (const child of payload?.data?.children || []) {
        const post = child?.data;
        if (post && requested.has(post.name)) posts.push(post);
      }
    }
    return posts;
  }

  return { request, search, postsByFullnames };
}

export async function discoverRedditPosts(
  client,
  { subreddits, queries, maxPages = 1, limit },
) {
  const posts = new Map();
  for (const subreddit of subreddits) {
    for (const query of queries) {
      let after;
      for (let page = 0; page < maxPages; page += 1) {
        const result = await client.search({ subreddit, query, after, limit });
        for (const post of result.posts) {
          if (REDDIT_FULLNAME_PATTERN.test(post?.name || "")) {
            posts.set(post.name, post);
          }
        }
        after = result.after;
        if (!after) break;
      }
    }
  }
  return [...posts.values()];
}
