import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

const WEBSITE_USER_AGENT =
  "AnystrideCoachDirectoryBot/1.0 (+https://anystride.com/privacy)";
const MAX_BODY_BYTES = 1_000_000;
const MAX_REDIRECTS = 4;

const blockedIpv6Networks = new BlockList();
for (const [network, prefix] of [
  ["::", 96], // IPv4-compatible and other special low addresses
  ["::ffff:0:0", 96], // IPv4-mapped addresses
  ["64:ff9b::", 96], // well-known NAT64 translation prefix
  ["64:ff9b:1::", 48], // local-use NAT64 translation prefix
  ["100::", 64], // discard-only
  ["2001::", 32], // Teredo
  ["2001:2::", 48], // benchmarking
  ["2001:10::", 28], // deprecated ORCHID
  ["2001:20::", 28], // ORCHIDv2
  ["2001:db8::", 32], // documentation
  ["2002::", 16], // 6to4
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link local
  ["fec0::", 10], // deprecated site local
  ["ff00::", 8], // multicast
]) {
  blockedIpv6Networks.addSubnet(network, prefix, "ipv6");
}

class HttpStatusError extends Error {
  constructor(status) {
    super(`Website returned status ${status}`);
    this.status = status;
  }
}

class RobotsUnavailableError extends Error {}
class RobotsDisallowedError extends Error {}

const blockedHostPatterns = [
  /(^|\.)reddit\.com$/,
  /(^|\.)redd\.it$/,
  /(^|\.)facebook\.com$/,
  /(^|\.)instagram\.com$/,
  /(^|\.)linkedin\.com$/,
  /(^|\.)twitter\.com$/,
  /(^|\.)x\.com$/,
  /(^|\.)youtube\.com$/,
  /(^|\.)youtu\.be$/,
  /(^|\.)tiktok\.com$/,
  /(^|\.)threads\.net$/,
  /(^|\.)strava\.com$/,
  /(^|\.)linktr\.ee$/,
  /(^|\.)beacons\.ai$/,
  /(^|\.)campsite\.bio$/,
  /(^|\.)bio\.site$/,
  /(^|\.)bit\.ly$/,
  /(^|\.)tinyurl\.com$/,
  /(^|\.)t\.co$/,
  /(^|\.)docs\.google\.com$/,
  /(^|\.)forms\.gle$/,
  /(^|\.)calendly\.com$/,
  /(^|\.)teamrunrun\.com$/,
  /(^|\.)coachup\.com$/,
  /(^|\.)vdoto2\.com$/,
  /(^|\.)finalsurge\.com$/,
];

const trackingParameters = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

const cityBuckets = new Map([
  ["new york", "New York"],
  ["boston", "Boston"],
  ["chicago", "Chicago"],
  ["los angeles", "Los Angeles"],
  ["san francisco", "San Francisco"],
]);

function decodeEntities(value) {
  const numericEntity = (match, rawCode, radix) => {
    const code = Number.parseInt(rawCode, radix);
    if (
      !Number.isInteger(code) ||
      code < 0 ||
      code > 0x10ffff ||
      (code >= 0xd800 && code <= 0xdfff)
    ) return match;
    return String.fromCodePoint(code);
  };
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (match, code) => numericEntity(match, code, 10))
    .replace(/&#x([\da-f]+);/gi, (match, code) => numericEntity(match, code, 16));
}

function normalize(value) {
  return decodeEntities(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function plainText(html) {
  return decodeEntities(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hostname(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIp(address) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version !== 6) return true;
  return blockedIpv6Networks.check(address, "ipv6");
}

export function canonicalWebsiteUrl(value) {
  try {
    const url = new URL(decodeEntities(value).trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    if (url.port && !["80", "443"].includes(url.port)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || trackingParameters.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    const host = url.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^\[|\]$/g, "")
      .replace(/\.+$/, "");
    if (
      !host ||
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host.endsWith(".local") ||
      blockedHostPatterns.some((pattern) => pattern.test(host)) ||
      (isIP(host) && isPrivateIp(host))
    ) {
      return null;
    }
    if (isIP(host) !== 6) url.hostname = host;
    if (/\.(?:jpe?g|png|gif|webp|svg|pdf|zip)$/i.test(url.pathname)) return null;
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.href;
  } catch {
    return null;
  }
}

function urlsFromText(value) {
  const matches = decodeEntities(value).match(/https?:\/\/[^\s<>"'\])}]+/gi) || [];
  return matches.map((match) => match.replace(/[.,;:!?]+$/, ""));
}

export function externalWebsiteUrls(post) {
  const values = [post?.url_overridden_by_dest, ...urlsFromText(post?.selftext || "")];
  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string")
        .map(canonicalWebsiteUrl)
        .filter(Boolean),
    ),
  ].slice(0, 4);
}

function explicitlyOwnedWebsiteUrls(post, availableUrls) {
  const text = `${post?.title || ""}\n${post?.selftext || ""}`;
  const owned = [];
  const urlPattern = "(https?:\\/\\/[^\\s<>\"'\\])}]+)";
  const patterns = [
    new RegExp(
      `\\b(?:my|our)\\s+(?:(?:running|run|endurance|triathlon)\\s+|coaching\\s+)?(?:website|site|business|practice)\\b[^\\n]{0,80}?${urlPattern}`,
      "gi",
    ),
    new RegExp(
      `${urlPattern}[^\\n]{0,40}?\\b(?:is|on)\\s+(?:my|our)\\s+(?:(?:running|run|endurance|triathlon)\\s+|coaching\\s+)?(?:website|site|business|practice)\\b`,
      "gi",
    ),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const captured = match[1]?.startsWith("http") ? match[1] : match[2];
      const canonical = canonicalWebsiteUrl(captured?.replace(/[.,;:!?]+$/, ""));
      if (canonical) owned.push(canonical);
    }
  }

  const destination = canonicalWebsiteUrl(post?.url_overridden_by_dest);
  if (
    destination &&
    /\b(?:my|our)\s+(?:(?:running|run|endurance|triathlon)\s+|coaching\s+)?(?:website|site|business|practice)\b/i.test(
      post?.title || "",
    )
  ) {
    owned.push(destination);
  }

  const available = new Set(availableUrls);
  return [...new Set(owned)].filter((url) => available.has(url));
}

const positiveIdentityPatterns = [
  /\bi(?:'m| am) (?:an? )?(?:running|run|endurance|triathlon|ultra(?:running)?) coach\b/i,
  /\bi coach (?:runners|athletes|triathletes)\b/i,
  /\bmy (?:running|run|endurance|triathlon|ultra(?:running)?) coaching (?:business|service|practice)\b/i,
  /\bwe (?:coach|offer) (?:runners|athletes|running|endurance|triathlon)\b/i,
  /\bour (?:running|run|endurance|triathlon) coaching\b/i,
];

const servicePatterns = [
  /\baccepting (?:new )?(?:athletes|clients|runners)\b/i,
  /\btaking (?:on )?(?:new )?(?:athletes|clients|runners)\b/i,
  /\bcoaching (?:spots?|openings?|services?|applications?)\b/i,
  /\bi offer (?:online |remote |in-person )?(?:run|running|endurance|triathlon) coaching\b/i,
  /\bwork with me\b/i,
];

const negativePatterns = [
  /\b(?:looking for|need|seeking|recommend(?: me)?|anyone know) (?:an? )?(?:good )?(?:running |run |online )?coach\b/i,
  /\bmy coach (?:said|told|gave|has|is|was)\b/i,
  /\b(?:warning|complaint|avoid|scam|review)\b.{0,40}\bcoach/i,
  /\b(?:hiring|recruiting) (?:an? )?(?:running |run |assistant )?coach\b/i,
  /\b(?:football|soccer|basketball|baseball|life|career|business|gaming|esports) coach(?:ing)?\b/i,
  /\b(?:kids|children|youth(?:-only)?|under-18) coaching\b/i,
];

export function candidateFromPost(post, { now = Date.now(), lookbackHours = 72 } = {}) {
  if (!post || post.stickied || post.over_18 || post.quarantine) return null;
  if (post.removed_by_category || post.author === "[deleted]") return null;
  if (["[deleted]", "[removed]"].includes(post.selftext)) return null;
  const createdAt = Number(post.created_utc) * 1_000;
  if (!Number.isFinite(createdAt) || now - createdAt > lookbackHours * 60 * 60 * 1_000) {
    return null;
  }

  const text = `${post.title || ""}\n${post.selftext || ""}`;
  if (negativePatterns.some((pattern) => pattern.test(text))) return null;
  if (!positiveIdentityPatterns.some((pattern) => pattern.test(text))) return null;
  if (!/\b(run|runner|running|endurance|marathon|ultra(?:running)?|triathlon)\b/i.test(text)) {
    return null;
  }
  if (!servicePatterns.some((pattern) => pattern.test(text))) return null;

  const externalUrls = externalWebsiteUrls(post);
  if (externalUrls.length === 0) return null;
  const websiteUrls = explicitlyOwnedWebsiteUrls(post, externalUrls);
  if (websiteUrls.length !== 1) return null;
  return {
    websiteUrls,
    score: 70,
    signalIds: ["explicit-coach-identity", "active-coaching-service", "direct-website"],
  };
}

async function resolvePublicDestination(url, dnsLookup = lookup) {
  const canonical = canonicalWebsiteUrl(url);
  if (!canonical) throw new Error("Website URL is not an allowed public HTTP(S) destination");
  const parsed = new URL(canonical);
  const addresses = await dnsLookup(parsed.hostname, { all: true, verbatim: true });
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error("Website hostname did not resolve");
  }
  const validated = addresses.map(({ address }) => ({ address, family: isIP(address) }));
  if (validated.some(({ address, family }) => !family || isPrivateIp(address))) {
    throw new Error("Website hostname resolves to a private or reserved network");
  }
  return { url: canonical, parsed, ...validated[0] };
}

export async function assertPublicDestination(url, dnsLookup = lookup) {
  return (await resolvePublicDestination(url, dnsLookup)).url;
}

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const value = headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function assertDeclaredSize(headers, maxBytes) {
  const contentLength = Number(headerValue(headers, "content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error("Website response exceeded the size limit");
  }
}

async function boundedFetchBody(response, maxBytes) {
  assertDeclaredSize(response.headers, maxBytes);
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    bytes += chunk.length;
    if (bytes > maxBytes) {
      await reader.cancel("response exceeded size limit");
      throw new Error("Website response exceeded the size limit");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes).toString("utf8");
}

async function requestWithInjectedFetch(destination, fetchImpl, maxBytes) {
  const response = await fetchImpl(destination.url, {
    redirect: "manual",
    headers: {
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
      "Accept-Encoding": "identity",
      "User-Agent": WEBSITE_USER_AGENT,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body = [301, 302, 303, 307, 308].includes(response.status)
    ? ""
    : await boundedFetchBody(response, maxBytes);
  return { status: response.status, ok: response.ok, headers: response.headers, body };
}

export function pinnedRequestOptions(destination, timeoutMs = 20_000) {
  const originalHost = destination.parsed.hostname;
  return {
    agent: false,
    family: destination.family,
    headers: {
      Accept: "text/html,application/xhtml+xml,text/plain;q=0.8",
      "Accept-Encoding": "identity",
      Host: destination.parsed.host,
      "User-Agent": WEBSITE_USER_AGENT,
    },
    lookup(_hostname, options, callback) {
      if (options?.all) {
        callback(null, [{ address: destination.address, family: destination.family }]);
      } else {
        callback(null, destination.address, destination.family);
      }
    },
    ...(destination.parsed.protocol === "https:" && !isIP(originalHost)
      ? { servername: originalHost }
      : {}),
    signal: AbortSignal.timeout(timeoutMs),
  };
}

function defaultRequestImpl(url, options, callback) {
  return (url.protocol === "https:" ? https : http).request(url, options, callback);
}

function requestWithPinnedSocket(
  destination,
  { requestImpl = defaultRequestImpl, maxBytes, timeoutMs = 20_000 },
) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const request = requestImpl(
      destination.parsed,
      pinnedRequestOptions(destination, timeoutMs),
      (response) => {
        const status = response.statusCode || 0;
        const headers = response.headers || {};
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.destroy();
          finish(resolve, { status, ok: false, headers, body: "" });
          return;
        }
        try {
          assertDeclaredSize(headers, maxBytes);
          const contentEncoding = headerValue(headers, "content-encoding");
          if (contentEncoding && contentEncoding.toLowerCase() !== "identity") {
            throw new Error("Website returned an unsupported content encoding");
          }
        } catch (error) {
          response.destroy();
          finish(reject, error);
          return;
        }

        const chunks = [];
        let bytes = 0;
        response.on("data", (value) => {
          const chunk = Buffer.from(value);
          bytes += chunk.length;
          if (bytes > maxBytes) {
            response.destroy();
            request.destroy();
            finish(reject, new Error("Website response exceeded the size limit"));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          finish(resolve, {
            status,
            ok: status >= 200 && status < 300,
            headers,
            body: Buffer.concat(chunks, bytes).toString("utf8"),
          });
        });
        response.on("error", (error) => finish(reject, error));
      },
    );
    request.on("error", (error) => finish(reject, error));
    request.end();
  });
}

async function requestPublicUrl(
  initialUrl,
  {
    fetchImpl,
    requestImpl,
    dnsLookup = lookup,
    maxBytes = MAX_BODY_BYTES,
    timeoutMs = 20_000,
    beforeRequest,
  } = {},
) {
  let current = initialUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const destination = await resolvePublicDestination(current, dnsLookup);
    current = destination.url;
    if (beforeRequest) await beforeRequest(current);
    const response = fetchImpl
      ? await requestWithInjectedFetch(destination, fetchImpl, maxBytes)
      : await requestWithPinnedSocket(destination, {
          requestImpl,
          maxBytes,
          timeoutMs,
        });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = headerValue(response.headers, "location");
      if (!location || redirect === MAX_REDIRECTS) {
        throw new Error("Website redirect could not be followed safely");
      }
      current = new URL(location, current).href;
      continue;
    }
    if (!response.ok) throw new HttpStatusError(response.status);
    const contentType = headerValue(response.headers, "content-type") || "";
    if (!/(?:text\/html|application\/xhtml\+xml|text\/plain)/i.test(contentType)) {
      throw new Error("Website did not return an HTML or text document");
    }
    return { url: current, html: response.body };
  }
  throw new Error("Website exceeded the redirect limit");
}

export function robotsAllows(robotsText, pathname, userAgent = "anystridecoachdirectorybot") {
  const groups = [];
  let current;
  for (const rawLine of String(robotsText || "").split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (field === "allow" || field === "disallow")) {
      current.rules.push({ type: field, path: value });
    }
  }
  const token = userAgent.toLowerCase();
  const scoredGroups = groups
    .map((group) => ({
      group,
      specificity: Math.max(
        -1,
        ...group.agents.map((agent) =>
          agent === "*" ? 0 : token === agent ? agent.length : -1,
        ),
      ),
    }))
    .filter(({ specificity }) => specificity >= 0);
  const maximumSpecificity = Math.max(-1, ...scoredGroups.map(({ specificity }) => specificity));
  const escapePattern = (value) => value.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const normalizeOctets = (value) => {
    let normalized = "";
    for (let index = 0; index < value.length;) {
      const encoded = value.slice(index).match(/^%([\da-f]{2})/i);
      if (encoded) {
        const byte = Number.parseInt(encoded[1], 16);
        const character = String.fromCharCode(byte);
        normalized += /^[A-Za-z0-9._~-]$/.test(character)
          ? character
          : `%${encoded[1].toUpperCase()}`;
        index += 3;
        continue;
      }

      const codePoint = value.codePointAt(index);
      const character = String.fromCodePoint(codePoint);
      if (codePoint > 0x7f) {
        normalized += [...Buffer.from(character, "utf8")]
          .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, "0")}`)
          .join("");
      } else {
        normalized += character;
      }
      index += character.length;
    }
    return normalized;
  };
  const normalizedPathname = normalizeOctets(pathname);
  const rules = scoredGroups
    .filter(({ specificity }) => specificity === maximumSpecificity)
    .flatMap(({ group }) => group.rules)
    .filter((rule) => rule.path);
  const applicable = rules
    .map((rule) => {
      const anchored = rule.path.endsWith("$");
      const rawPath = normalizeOctets(anchored ? rule.path.slice(0, -1) : rule.path);
      const expression = rawPath.split("*").map(escapePattern).join(".*");
      return {
        ...rule,
        specificity: rawPath
          .replaceAll("*", "")
          .replace(/%[\dA-F]{2}/g, "_").length,
        matches: new RegExp(`^${expression}${anchored ? "$" : ""}`).test(normalizedPathname),
      };
    })
    .filter((rule) => rule.matches)
    .sort(
      (a, b) =>
        b.specificity - a.specificity ||
        (a.type === b.type ? 0 : a.type === "allow" ? -1 : 1),
    );
  return applicable[0]?.type !== "disallow";
}

export async function fetchCoachWebsite(url, options = {}) {
  let canonical;
  try {
    canonical = await assertPublicDestination(url, options.dnsLookup);
  } catch {
    return { status: "review", reasonCodes: ["website-destination-blocked"] };
  }
  const robotsByOrigin = new Map();
  const assertRobotsAllows = async (pageUrl) => {
    const parsed = new URL(pageUrl);
    let robots = robotsByOrigin.get(parsed.origin);
    if (!robots) {
      try {
        const result = await requestPublicUrl(new URL("/robots.txt", parsed.origin).href, {
          ...options,
          beforeRequest: undefined,
          maxBytes: 100_000,
        });
        robots = { available: true, text: result.html };
      } catch (error) {
        if (error instanceof HttpStatusError && error.status === 404) {
          robots = { available: false, missing: true };
        } else {
          throw new RobotsUnavailableError();
        }
      }
      robotsByOrigin.set(parsed.origin, robots);
    }
    if (
      robots.available &&
      !robotsAllows(robots.text, `${parsed.pathname || "/"}${parsed.search}`)
    ) {
      throw new RobotsDisallowedError();
    }
  };
  try {
    const page = await requestPublicUrl(canonical, {
      ...options,
      beforeRequest: assertRobotsAllows,
    });
    return { status: "fetched", ...page };
  } catch (error) {
    if (error instanceof RobotsDisallowedError) {
      return { status: "review", reasonCodes: ["robots-disallowed"] };
    }
    if (error instanceof RobotsUnavailableError) {
      return { status: "review", reasonCodes: ["robots-unavailable"] };
    }
    return { status: "review", reasonCodes: ["website-unavailable"] };
  }
}

function jsonLdNodes(html) {
  const nodes = [];
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    nodes.push(value);
    if (Array.isArray(value["@graph"])) value["@graph"].forEach(visit);
  };
  for (const match of scripts) {
    try {
      visit(JSON.parse(decodeEntities(match[1]).trim()));
    } catch {}
  }
  return nodes;
}

function nodeTypes(node) {
  const value = node?.["@type"];
  return (Array.isArray(value) ? value : [value]).filter(Boolean).map(String);
}

function validPublicName(value) {
  const name = plainText(value).replace(/\s+/g, " ").trim();
  const words = name.split(" ").filter(Boolean);
  if (name.length < 3 || name.length > 90 || words.length > 8) return null;
  if (!/[A-Za-z]/.test(name) || /https?:|@|\b(home|about|services?)\b/i.test(name)) return null;
  if (/^(?:run(?:ning)? coach(?:ing)?|online coaching|endurance coaching)$/i.test(name)) return null;
  return name;
}

function titleCandidates(html) {
  const values = [
    ...[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => plainText(match[1])),
    ...[...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map((match) => plainText(match[1])),
  ];
  return values
    .flatMap((value) => value.split(/\s+[|–—]\s+|\s+-\s+/).slice(0, 1))
    .map((value) =>
      value
        .replace(/^(?:coach)\s+/i, "")
        .replace(/\s+(?:running|run|endurance|triathlon) coach(?:ing)?\b.*$/i, "")
        .trim(),
    )
    .map(validPublicName)
    .filter(Boolean);
}

function looksLikePersonName(value) {
  const words = value.split(/\s+/).filter(Boolean);
  const generic = new Set(["the", "best", "home", "official", "personal", "personalized", "online"]);
  return (
    words.length >= 2 &&
    words.length <= 5 &&
    !words.some((word) => generic.has(normalize(word))) &&
    words.every((word) => /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ'.-]*$/.test(word))
  );
}

function uniqueByNormalized(values) {
  const found = new Map();
  for (const value of values) found.set(normalize(value), value);
  return [...found.values()];
}

function locationFromNode(node) {
  const address = Array.isArray(node?.address) ? node.address[0] : node?.address;
  if (!address || typeof address !== "object") return { display: "", locality: "" };
  const locality = plainText(
    typeof address.addressLocality === "object"
      ? address.addressLocality?.name
      : address.addressLocality,
  );
  const display = [locality, address.addressRegion, address.addressCountry]
    .map((value) => plainText(typeof value === "object" ? value?.name : value))
    .filter(Boolean)
    .filter((value, index, values) => index === 0 || normalize(value) !== normalize(values[index - 1]))
    .join(", ");
  return { display, locality };
}

function slugify(value) {
  return normalize(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}

function inferCoachFields(name, location, locality, format, pageText, sourceUrl, checkedAt) {
  const text = normalize(pageText);
  const focus = [];
  if (/\b(beginner|first 5k|first race|couch to|new runner|return to running)\b/.test(text)) focus.push("first-timers");
  if (/\b(5k|10k|track|cross country|mile|1500m|1600m)\b/.test(text)) focus.push("5k-10k");
  if (/\bhalf marathon\b/.test(text)) focus.push("half");
  if (/\bmarathon\b/.test(text)) focus.push("marathon");
  if (/\b(performance|personal best|\bpr\b|competitive|elite|boston qualif|race strategy)\b/.test(text)) focus.push("performance");
  if (/\b(injur|rehab|prehab|physical therap|strength|mobility|biomechan)\b/.test(text)) focus.push("injury-aware");
  if (/\b(triathlon|ironman|multisport)\b/.test(text)) focus.push("triathlon");
  if (focus.length === 0) focus.push("performance");

  const specialtyRules = [
    [/\bpersonalized|individuali[sz]ed|custom training\b/, "Personalized training"],
    [/\bstrength(?: training)?|conditioning\b/, "Strength training"],
    [/\bnutrition|fueling\b/, "Nutrition"],
    [/\binjur|rehab|prehab|physical therap|mobility\b/, "Injury-aware training"],
    [/\bultra|trail running\b/, "Trail and ultrarunning"],
    [/\btrack|cross country\b/, "Track and cross-country"],
    [/\bbeginner|new runner|couch to\b/, "Beginner runners"],
    [/\bmasters? runner|over 40\b/, "Masters runners"],
    [/\bboston qualif\b/, "Boston qualifying"],
    [/\btriathlon|ironman|multisport\b/, "Triathlon"],
    [/\bmarathon\b/, "Marathon"],
    [/\bhalf marathon\b/, "Half marathon"],
    [/\b5k|10k\b/, "5K and 10K"],
  ];
  const specialties = specialtyRules
    .filter(([pattern]) => pattern.test(text))
    .map(([, label]) => label)
    .slice(0, 5);
  if (specialties.length === 0) specialties.push("Individual running coaching");

  const resolvedLocation = location || "Online";
  const city = locality
    ? cityBuckets.get(normalize(locality)) || locality
    : "Online";
  const formatPhrase =
    format === "hybrid" ? "online and in-person" : format === "in-person" ? "in-person" : "online";
  const specialtyPhrase = specialties
    .slice(0, 3)
    .map((value) => value.toLowerCase())
    .join(", ")
    .replace(/, ([^,]+)$/, " and $1");

  return {
    slug: `coach-${slugify(name.replace(/^coach\s+/i, ""))}`,
    name,
    city,
    location: resolvedLocation,
    format,
    focus: [...new Set(focus)],
    specialties,
    blurb: `${name} offers ${formatPhrase} running coaching with a focus on ${specialtyPhrase}.`,
    bio: [`${name} offers ${formatPhrase} coaching focused on ${specialtyPhrase}.`],
    link: sourceUrl,
    source: { name: hostname(sourceUrl), url: sourceUrl },
    sourceCheckedAt: checkedAt,
    verified: false,
  };
}

export function coachFromWebsite({ html, url, baseScore = 70, checkedAt }) {
  const pageText = plainText(html);
  const normalized = normalize(pageText);
  if (pageText.length < 250) {
    return { status: "review", score: baseScore, reasonCodes: ["website-content-too-thin"] };
  }
  if (!/\b(coach|coaching)\b/.test(normalized) || !/\b(run|runner|running|marathon|endurance|triathlon|ultra)\b/.test(normalized)) {
    return { status: "review", score: baseScore, reasonCodes: ["website-not-running-coaching"] };
  }
  if (!/\b(personalized|individual|one on one|one-to-one|athlete|client|training plan|coaching service|work with)\b/.test(normalized)) {
    return { status: "review", score: baseScore + 20, reasonCodes: ["personal-coaching-not-confirmed"] };
  }
  const online = /\b(online|remote|virtual)\b/.test(normalized);
  const inPerson = /\b(in person|in-person|local coaching)\b/.test(normalized);
  const format = online && inPerson
    ? "hybrid"
    : inPerson
      ? "in-person"
      : online
        ? "online"
        : null;
  if (!format) {
    return { status: "review", score: baseScore + 20, reasonCodes: ["website-format-not-confirmed"] };
  }

  const nodes = jsonLdNodes(html);
  const personNodes = nodes.filter((node) => nodeTypes(node).includes("Person"));
  const coachingPeople = personNodes.filter((node) =>
    /\b(coach|coaching|run|running|endurance|triathlon)\b/.test(
      normalize(`${node.jobTitle || ""} ${node.description || ""}`),
    ),
  );
  const personNames = uniqueByNormalized(
    coachingPeople.map((node) => validPublicName(node.name)).filter(Boolean),
  );
  if (personNames.length > 1) {
    return { status: "review", score: baseScore + 20, reasonCodes: ["multiple-coaches-on-website"] };
  }

  const organizationNodes = nodes.filter((node) =>
    nodeTypes(node).some((type) =>
      ["Organization", "LocalBusiness", "ProfessionalService", "SportsActivityLocation"].includes(type),
    ),
  );
  const organizationNames = uniqueByNormalized(
    organizationNodes
      .map((node) => validPublicName(node.name))
      .filter((name) => name && /\b(run|running|coach|coaching|endurance|triathlon|athletic)\b/i.test(name)),
  );
  if (personNames.length === 0 && organizationNames.length > 1) {
    return { status: "review", score: baseScore + 20, reasonCodes: ["multiple-coaching-identities-on-website"] };
  }
  const fallbackNames = uniqueByNormalized(titleCandidates(html).filter(looksLikePersonName));
  const name = personNames[0] || organizationNames[0] || (fallbackNames.length === 1 ? fallbackNames[0] : "");
  if (!name) {
    return { status: "review", score: baseScore + 20, reasonCodes: ["website-identity-ambiguous"] };
  }

  const identityNode = personNames[0]
    ? coachingPeople.find((node) => normalize(node.name) === normalize(personNames[0]))
    : organizationNodes.find((node) => normalize(node.name) === normalize(name));
  const { display: location, locality } = locationFromNode(identityNode);
  if (format === "in-person" && !locality) {
    return { status: "review", score: baseScore + 30, reasonCodes: ["website-location-not-confirmed"] };
  }
  const activeService = /\b(accepting|apply|book|coaching services?|work with|consultation|custom training)\b/.test(normalized);
  const score = baseScore + 20 + 10 + (activeService ? 10 : 0) + 5;
  const status = score >= 100 ? "ready" : "review";
  if (status !== "ready") {
    return { status, score, reasonCodes: ["website-confidence-below-threshold"] };
  }

  const sourceUrl = canonicalWebsiteUrl(url);
  return {
    status,
    score,
    reasonCodes: [],
    evidence: [
      "post directly supplied the website",
      "personalized running or endurance coaching is offered",
      "public coach or business identity appears on the website",
      ...(activeService ? ["website presents an active coaching service"] : []),
      "coaching format is explicitly listed",
      ...(location ? ["broad location is listed"] : []),
    ],
    coach: inferCoachFields(name, location, locality, format, pageText, sourceUrl, checkedAt),
  };
}

export function registryRecord({
  websiteUrl,
  assessment,
  previous,
  checkedAt,
  publishReady = false,
}) {
  const completedNewReviewCycle =
    assessment.status === "ready" && previous?.lastCheckedAt !== checkedAt;
  const reviewCycles = (previous?.reviewCycles || 0) + (completedNewReviewCycle ? 1 : 0);
  const base = {
    schemaVersion: 1,
    websiteUrl: canonicalWebsiteUrl(websiteUrl),
    status: assessment.status,
    firstCheckedAt: previous?.firstCheckedAt || checkedAt,
    lastCheckedAt: checkedAt,
    score: assessment.score,
    reasonCodes: assessment.reasonCodes,
  };
  if (assessment.status === "ready" && publishReady) {
    return {
      ...base,
      reviewCycles,
      website: {
        url: assessment.coach.link,
        checkedAt,
        evidence: assessment.evidence,
      },
      coachSlug: assessment.coach.slug,
      coach: assessment.coach,
    };
  }
  if (assessment.status === "ready") {
    return {
      ...base,
      status: "review",
      reviewCycles,
      reasonCodes: ["shadow-review-required"],
      website: {
        url: assessment.coach.link,
        checkedAt,
        evidence: assessment.evidence,
      },
      proposedCoach: assessment.coach,
    };
  }
  return base;
}

export function deduplicateRegistry(records, existingCoaches = []) {
  const existingNames = new Set(existingCoaches.map((coach) => normalize(coach.name)));
  const existingSlugs = new Set(existingCoaches.map((coach) => coach.slug));
  const websiteKeys = new Set();
  const readyNames = new Set();

  return records
    .sort((a, b) => a.websiteUrl.localeCompare(b.websiteUrl))
    .map((record) => {
      const key = canonicalWebsiteUrl(record.websiteUrl);
      if (websiteKeys.has(key)) return null;
      websiteKeys.add(key);
      if (record.status !== "ready") return record;
      const name = normalize(record.coach.name);
      if (existingNames.has(name) || existingSlugs.has(record.coach.slug) || readyNames.has(name)) {
        return {
          schemaVersion: 1,
          websiteUrl: record.websiteUrl,
          status: "duplicate",
          firstCheckedAt: record.firstCheckedAt,
          lastCheckedAt: record.lastCheckedAt,
          score: record.score,
          reasonCodes: ["already-listed"],
        };
      }
      readyNames.add(name);
      return record;
    })
    .filter(Boolean);
}
