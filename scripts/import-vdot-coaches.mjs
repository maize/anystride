#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const registryPath = join(root, "src/data/vdot-coach-registry.generated.json");
const coachesPath = join(root, "src/data/vdot-coaches.generated.ts");
const checkedAt = new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes("--dry-run");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const concurrencyArg = process.argv.find((arg) => arg.startsWith("--concurrency="));
const concurrency = concurrencyArg ? Number(concurrencyArg.split("=")[1]) : 4;

if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
  throw new Error("--limit must be a positive integer");
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
  throw new Error("--concurrency must be an integer from 1 to 8");
}
if (limit !== undefined && !dryRun) {
  throw new Error("--limit is only available with --dry-run so partial data is never published");
}

const userAgent = "AnystrideDirectoryResearch/1.0 (+https://anystride.com/editorial)";
const readerPrefix = "https://r.jina.ai/";
const vdotProfilePrefix = "https://vdoto2.com/running-coach/";
const knownInvalidProfiles = new Set(["tucker-robertson"]);
const identityOverrides = {
  "adn-run": ["DAVID MARTINEZ", "MEXICO"],
  "arash-taheri": ["Arash Taheri", "Ridgeland, Mississippi, United States"],
  "chase-solarin": ["Chase Solarin", "San Diego, California, United States"],
  "coach-tammy": ["Tammy Whyte", "Chicago, IL, United States"],
  "de-la-cruz": ["Dr. Andres T. De La Cruz, DC, CSCS", "Pasadena, CA, United States"],
  "derek-riedel": ["Derek Riedel", "San Antonio, TX, United States"],
  endurance4you: ["Elizabeth Miller", "San Antonio, Texas, United States"],
  ericthomas: ["Eric Thomas", "Birmingham, Alabama, United States"],
  "g-force": ["Mark Good", "Jackson, Michigan, United States"],
  "ian-paramore": ["Ian Paramore", "Loughborough, Leicestershire, United Kingdom"],
  "jonathan-lyau": ["Jonathan Lyau", "Honolulu, Hawaii, United States"],
  "joseph-gendy": ["Joseph Gendy", "Raleigh, North Carolina, United States"],
  "karen-dunn": ["Karen Dunn", "Collegeville, Pennsylvania, United States"],
  "kevin-huwe": ["Kevin Huwe", "Chattanooga, TN, U.S"],
  "kevin-strehlo": ["Coach Kevin Strehlo", "Los Angeles, CA, United States"],
  "kim-elia": ["Kim Elia", "Hudson, MA, USA"],
  performancephysique: ["Arj Thiruchelvam", "Solihull, Birmingham, United Kingdom"],
  roadrunnercoaching: ["Brian Lock", "Dunlap, Illinois, USA"],
  robvancleve: ["Rob VanCleve", "Columbus, OH, United States"],
  "rod-koborsi": ["Rod Koborsi", "San Francisco, California, United States"],
  rundreamachieve: ["Nathan Pennington", "Grand Haven, Michigan, United States"],
  slowafrunclub: ["Martinus Evans", "Atlanta, New York, United States"],
  "toni-kengor": ["Toni Kengor", "Pittsburgh, PA, United States"],
  "vince-sherry": ["Vince Sherry", "Flagstaff, Arizona, United States"],
  zwonlinecoach: ["Zacharias Wedel", "Fürth, Bayern, Germany"],
};

// Leads captured from each coach's public V.O2 profile and classified by hostname.
// Every lead is fetched and validated before publication; a lead alone is not enough.
const seededWebsiteLeads = {
  "will-baldwin": ["https://www.runbaldwin.com/", "profile-link"],
  "leahrosenfeld": ["https://www.leahrosenfeld.com/", "reviewed-search"],
  "megan-cooke": ["https://www.ngucoaching.com/", "reviewed-search"],
  "dylan-belles": ["https://dylanbelles.com/", "profile-link"],
  "kristyn-r-smith": ["https://coachkrisrs.com/", "profile-link"],
  "nicholas-hilton": ["https://hiltonperformancerunning.com/", "profile-link"],
  "michelle-baxter": ["https://www.therunnersplate.com/", "profile-link"],
  "tiffany-england": ["https://www.englandrunning.com/", "profile-link"],
  "steve-crnic": ["https://www.scrunfit.com/", "profile-link"],
  "andrew-samuels": ["https://coachandrew.co/", "profile-link"],
  roabel: ["https://www.runwithroabel.com/", "profile-link"],
  backroadsendurance: ["https://www.backroadsendurance.com/", "profile-link"],
  "amanda-hoang": ["https://www.mandymovez.com/", "profile-link"],
  paulwhittaker: ["https://pwperformancecoaching.com/", "profile-link"],
  "adam-burum": ["https://absptrack.com/", "profile-link"],
  "andie-cozzarelli": ["https://run4acozz.com/", "profile-link"],
  "angela-reckart": ["https://www.ngucoaching.com/", "profile-link"],
  "eat-fitness": ["https://evantitusfitness.wixsite.com/evantitusbuilt", "profile-link"],
  "rachel-turner": ["https://runnersnutritioncoach.com/", "profile-link"],
  "ben-lauder-dykes": ["https://www.bldapproved.com/", "profile-link"],
  tayloredtraining: ["https://www.tayloredtrainingrun.com/", "profile-link"],
  "jordan-colby": ["https://topstependurance.com/", "profile-link"],
  "malindi-elmore": ["https://www.malindielmore.com/", "profile-link"],
  "pamela-hunt": ["https://www.orithyia.nyc/coaching", "profile-link"],
  "coach-joe-shayne": ["https://www.werunkings.com/", "profile-link"],
  petesimon: ["https://petesimon.com/", "profile-link"],
  "sarah-kozul": ["https://www.runnerssense.com/", "profile-link"],
  "dami-alao": ["https://trainbaseline.net/", "profile-link"],
  "becky-croft": ["https://hustle-eat-thrive.myshopify.com/", "profile-link"],
  runwildcoaching: ["https://runwildcoaching.fit/", "profile-link"],
  "bonnie-wilder": ["https://www.runningtheextramiles.com/", "profile-link"],
  "david-abbott": ["http://davidabbott.io/", "profile-link"],
  "richard-airey": ["https://www.blacksheependurance.com/", "profile-link"],
  "juan-carlos-arcos-lira": ["https://www.arsport.com.mx/", "profile-link"],
  "melanie-boyd": ["https://www.runmelarun.com/", "profile-link"],
  shainacales: ["https://www.sparkrunning.co/", "profile-link"],
  "mark-day": ["https://www.racewithoutfear.com/", "profile-link"],
  "daniel-farrugia": ["https://distancerunnersunlimited.squarespace.com/", "profile-link"],
  coachnih: ["https://werunkings.com/", "profile-link"],
  magnumopuscoaching: ["http://www.magnumopuscoaching.com/", "profile-link"],
  amrunningvb: ["https://amrunningvb.com/", "profile-link"],
  mikkelgislejohnsen: ["https://www.mgjcoaching.no/international", "profile-link"],
  fleetfeetnashville: ["https://www.fleetfeetnashville.com/", "profile-link"],
  "stuart-lamp": ["https://www.allied-endurance.com/", "profile-link"],
  lopiccolo: ["https://www.lpendurance.com/", "profile-link"],
  "christina-mather": ["https://mathercoachingservices.weebly.com/", "profile-link"],
  "brendan-mcgoldrick": ["https://www.bdtendurance.com/", "profile-link"],
  scissortailrunning: ["https://scissortailrunning.com/", "profile-link"],
  "cary-morgan": ["https://www.cadenceruncoaching.com/", "profile-link"],
  "resilience-run-co": ["https://resiliencerunco.ca/", "profile-link"],
  "bridget-oldenburg-1": ["https://runwithurheart.com/", "profile-link"],
  risereigntraining: ["https://www.risereigntraining.com/", "profile-link"],
  coachkarli: ["https://www.irondiamondfitness.com/", "profile-link"],
  "gaby-go": ["https://www.gorunstronger.com/", "profile-link"],
  "kelly-vigil": ["https://www.moremilesraces.com/coaching", "profile-link"],
  "joseph-winwood": ["https://southernmostrunningco.com/", "profile-link"],
  "scott-brown": ["https://samurairunningjapan.com/", "profile-link"],
  "alexander-felicier": ["https://718run.com/", "profile-link"],
  "fast-pack-running": ["https://fastpackrunning.com/", "profile-link"],
  zwonlinecoach: ["https://www.zacharias-wedel.de/", "profile-link"],
  lindseyaltermatt: ["https://mntrailruncollective.com/", "profile-link"],
  maddie: ["https://www.joyfulrunningcoaching.com/", "profile-link"],
  "noa-besner": ["https://runcoachnoa.com/", "profile-link"],
  "heather-caplan-rdn": ["http://heathercaplan.com/", "profile-link"],
  "riley-coulter": ["https://www.driftlessdistanceproject.com/", "profile-link"],
  "trish-dobrowski": ["https://www.longrunpt.com/", "profile-link"],
  coachlaurafilla: ["https://fillaendurance.com/", "profile-link"],
  "joseph-gendy": ["https://www.festinalentecoaching.com/", "profile-link"],
  charathoner: ["http://www.charathoner.com/", "profile-link"],
  "brooklynn-harvey": ["https://www.47runcoaching.com/", "profile-link"],
  "toni-kengor": ["https://www.relentlessrunners.com/", "profile-link"],
  "dimitris-kyriakopoulos": ["https://your-running-university.myshopify.com/", "profile-link"],
  roadrunnercoaching: ["https://www.roadrunnercoaching.com/", "profile-link"],
  "jonathan-lyau": ["http://www.personalbesttraininghi.com/", "profile-link"],
  endurance4you: ["https://endurance4you.com/run-coaching/", "profile-link"],
  "ian-paramore": ["https://runnerbeancoaching.wordpress.com/", "profile-link"],
  rundreamachieve: ["https://www.rundreamachieve.com/", "profile-link"],
  "evan-schwartz": ["https://www.evanschwartzcoaching.com/", "profile-link"],
  eta: ["https://www.endurancetrainingalliance.org/", "profile-link"],
  "louis-serafini": ["https://serafinicoaching.run/", "profile-link"],
  "hannah-shakeshaft": ["https://www.overlaprunning.com/", "profile-link"],
  runstark: ["https://runstark.co.uk/home-1", "profile-link"],
  performancephysique: ["https://www.performancephysique.co.uk/", "profile-link"],
  "tw-training": ["https://www.tw-training.com/", "profile-link"],
  "coach-tammy": ["https://www.tw-training.com/", "profile-link"],
  "the-endurance-collective": ["https://www.thendurancecollective.com/", "profile-link"],
  "evan-espinoza": ["https://steadystate.coach/", "profile-link"],
  "amy-windle": ["https://coachamywindle.my.canva.site/", "profile-link"],
  "karen-dunn": ["https://www.strengthenyourstride.coach/", "profile-link"],
  slowafrunclub: ["https://slowafrunclub.com/", "profile-link"],
  "chase-solarin": ["https://www.chaseruns.com/", "profile-link"],
  "kim-elia": ["https://www.orthonept.com/", "profile-link"],
  "alli-felsenthal": ["https://runafastermarathon.com/", "profile-link"],
  "ali-greenberg": ["https://ali-g-running-co.square.site/", "profile-link"],
  "vince-sherry": ["http://runsmartproject.com/", "profile-link"],
  "carolinehogardhrunning": ["https://carolinehogardhrunning.webnode.se/", "reviewed-search"],
  "andy-mcghee-coaching": ["https://andymcgheecoaching.com/", "reviewed-search"],
};

const blockedHostPatterns = [
  /(^|\.)vdoto2\.com$/,
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
  /(^|\.)vimeo\.com$/,
  /(^|\.)linktr\.ee$/,
  /(^|\.)campsite\.bio$/,
  /(^|\.)spotify\.com$/,
  /(^|\.)docs\.google\.com$/,
  /(^|\.)forms\.gle$/,
  /(^|\.)dot\.cards$/,
  /(^|\.)runnerstribe\.com$/,
  /(^|\.)worldathletics\.org$/,
  /(^|\.)athletic\.net$/,
  /(^|\.)milesplit\.com$/,
  /(^|\.)runnersworld\.com$/,
  /(^|\.)teamrunrun\.com$/,
  /(^|\.)coachup\.com$/,
];

const cityBuckets = new Map([
  ["new york", "New York"],
  ["boston", "Boston"],
  ["chicago", "Chicago"],
  ["los angeles", "Los Angeles"],
  ["san francisco", "San Francisco"],
]);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function plainText(value) {
  return decodeEntities(value)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_#>`~|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return plainText(String(value || ""))
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isBlockedWebsite(url) {
  const host = hostname(url);
  return !host || blockedHostPatterns.some((pattern) => pattern.test(host));
}

async function requestText(url, { attempts = 3, timeout = 30_000, maxLength = 750_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": userAgent, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" },
        signal: AbortSignal.timeout(timeout),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const text = (await response.text()).slice(0, maxLength);
      return { text, url: response.url, contentType: response.headers.get("content-type") || "" };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(400 * attempt);
    }
  }
  throw lastError;
}

async function mapConcurrent(items, worker, size = concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  return results;
}

function profileLinks(markdown) {
  return [...markdown.matchAll(/https?:\/\/(?:www\.)?vdoto2\.com\/running-coach\/([A-Za-z0-9_-]+)/g)]
    .map((match) => match[1].toLowerCase());
}

function structuredDirectoryEntries(markdown) {
  const entries = [];
  const pattern = /\[!\[Image \d+: ([^\]]+)\]\([^)]+\)\s+###\s+([\s\S]*?)\]\(https?:\/\/(?:www\.)?vdoto2\.com\/running-coach\/([^)]+)\)/g;
  for (const match of markdown.matchAll(pattern)) {
    const name = plainText(match[1]);
    const heading = plainText(match[2].split(" | ")[0]);
    const location = (normalize(heading).startsWith(normalize(name)) ? heading.slice(name.length).trim() : heading)
      .replace(/\s+,/g, ",");
    entries.push({ slug: match[3].toLowerCase(), name, location });
  }
  return entries;
}

async function discoverProfiles() {
  const discoveries = new Map();
  for (let page = 1; page <= 20; page += 1) {
    const paths = [
      `${readerPrefix}http://vdoto2.com/running-coaches/all?sort=newest&page=${page}`,
      `${readerPrefix}http://www.vdoto2.com/running-coaches/all?sort=newest&page=${page}`,
    ];
    const variants = await Promise.all(paths.map((url) => requestText(url).then(({ text }) => text).catch(() => "")));
    const slugs = [...new Set(variants.flatMap(profileLinks))];
    if (slugs.length === 0) break;
    const structured = new Map(variants.flatMap(structuredDirectoryEntries).map((entry) => [entry.slug, entry]));
    for (const slug of slugs) {
      const entry = structured.get(slug);
      discoveries.set(slug, {
        slug,
        profileUrl: `${vdotProfilePrefix}${slug}`,
        name: entry?.name || "",
        location: entry?.location || "",
      });
    }
    console.log(`Directory page ${page}: ${slugs.length} profiles (${structured.size} structured)`);
    if (slugs.length < 20) break;
  }

  for (const [slug, [name, location]] of Object.entries(identityOverrides)) {
    const discovery = discoveries.get(slug);
    if (!discovery) continue;
    discovery.name ||= name;
    discovery.location ||= location;
  }

  let missing = [...discoveries.values()].filter((entry) => !entry.name || !entry.location);
  if (missing.length) {
    const fallbackPages = await mapConcurrent(
      Array.from({ length: 10 }, (_, index) => index + 1),
      async (page) => {
        const variants = await Promise.all([
          requestText(`${readerPrefix}http://vdoto2.com/running-coaches/all?page=${page}`).then(({ text }) => text).catch(() => ""),
          requestText(`${readerPrefix}http://www.vdoto2.com/running-coaches/all?page=${page}`).then(({ text }) => text).catch(() => ""),
        ]);
        return variants.flatMap(structuredDirectoryEntries);
      },
      4,
    );
    for (const entry of fallbackPages.flat()) {
      const discovery = discoveries.get(entry.slug);
      if (!discovery) continue;
      discovery.name ||= entry.name;
      discovery.location ||= entry.location;
    }
    missing = [...discoveries.values()].filter((entry) => !entry.name || !entry.location);
  }

  await mapConcurrent(missing, async (entry) => {
    try {
      const { text } = await requestText(`${readerPrefix}${entry.profileUrl}`, { maxLength: 100_000 });
      const title = text.match(/^Title:\s*(.+?)\s+-\s+Running Coach/im)?.[1];
      const location = text.match(/^#{1,3}\s+Running Coach in\s+(.+)$/im)?.[1];
      entry.name = title ? plainText(title) : entry.name;
      entry.location = location ? plainText(location).replace(/\s+,/g, ",") : entry.location;
    } catch (error) {
      entry.discoveryError = String(error);
    }
  });

  const unresolved = [...discoveries.values()].filter((entry) => !entry.name || !entry.location).length;
  if (unresolved) console.log(`${unresolved} profiles still need identity review after the directory pass.`);
  return [...discoveries.values()];
}

function extractTitle(value) {
  return plainText(
    value.match(/^Title:\s*(.+)$/im)?.[1] ||
      value.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      "",
  );
}

function extractLinks(value, baseUrl) {
  const links = [];
  for (const match of value.matchAll(/(?:href=["']([^"']+)["']|\[[^\]]*\]\((https?:\/\/[^)]+)\))/gi)) {
    try {
      const url = new URL(match[1] || match[2], baseUrl);
      if (["http:", "https:"].includes(url.protocol)) links.push(url.href);
    } catch {}
  }
  return [...new Set(links)];
}

function isChallengePage(value) {
  const text = normalize(value.slice(0, 15_000));
  return ["just a moment", "verify you are human", "checking your browser", "access denied", "enable javascript and cookies"].some((phrase) => text.includes(phrase));
}

async function readWebsitePage(url) {
  let direct;
  try {
    direct = await requestText(url, { attempts: 2, timeout: 20_000 });
    const text = plainText(direct.text);
    if (text.length >= 300 && !isChallengePage(direct.text)) {
      return { url: direct.url, title: extractTitle(direct.text), text, links: extractLinks(direct.text, direct.url) };
    }
  } catch {}

  try {
    const target = direct?.url || url;
    const readable = await requestText(`${readerPrefix}${target}`, { attempts: 2, timeout: 45_000 });
    const text = plainText(readable.text.replace(/^Markdown Content:\s*/im, ""));
    if (text.length >= 300 && !isChallengePage(readable.text)) {
      return { url: target, title: extractTitle(readable.text), text, links: extractLinks(readable.text, target) };
    }
  } catch {}
  return null;
}

function usefulInternalLinks(page) {
  const origin = new URL(page.url).origin;
  return page.links
    .filter((link) => {
      const url = new URL(link);
      return url.origin === origin && /\b(about|coach|coaching|services?|training)\b/i.test(url.pathname);
    })
    .filter((link) => !/\.(?:jpg|jpeg|png|webp|svg|pdf)$/i.test(new URL(link).pathname))
    .slice(0, 2);
}

async function readWebsite(url) {
  if (isBlockedWebsite(url)) return null;
  const first = await readWebsitePage(url);
  if (!first || isBlockedWebsite(first.url)) return null;
  const extraUrls = usefulInternalLinks(first).filter((candidate) => candidate !== first.url).slice(0, 1);
  const extras = await mapConcurrent(extraUrls, readWebsitePage, 1);
  return [first, ...extras.filter(Boolean)];
}

function decodeBingUrl(value) {
  try {
    const url = new URL(value);
    if (!/(^|\.)bing\.com$/.test(url.hostname)) return url.href;
    const encoded = url.searchParams.get("u");
    if (!encoded?.startsWith("a1")) return "";
    return Buffer.from(encoded.slice(2), "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function searchResults(markdown) {
  const results = [];
  const pattern = /(?:^|\n)\d+\.\s+##\s+\[([\s\S]*?)\]\((https?:\/\/[^)]+)\)\s*\n([\s\S]*?)(?=\n\d+\.\s+##\s+|\n\d+\.\s{4,}\*|$)/g;
  for (const match of markdown.matchAll(pattern)) {
    const url = decodeBingUrl(match[2]);
    if (!url || isBlockedWebsite(url)) continue;
    results.push({ title: plainText(match[1]), url, snippet: plainText(match[3].slice(0, 700)) });
  }
  return results.slice(0, 8);
}

function significantNameTokens(name) {
  return normalize(name)
    .split(" ")
    .filter((token) => token.length > 1 && !["dr", "dpt", "rdn", "cscs", "coach", "running", "the"].includes(token));
}

function candidateScore(candidate, profile) {
  const haystack = normalize(`${candidate.title} ${candidate.snippet}`);
  const tokens = significantNameTokens(profile.name);
  const fullName = tokens.length > 1 && tokens.every((token) => haystack.includes(token));
  const surname = tokens.at(-1) || "";
  const domain = normalize(hostname(candidate.url));
  const locationTokens = normalize(profile.location).split(" ").filter((token) => token.length > 3);
  let score = 0;
  if (fullName) score += 5;
  if (/\b(run|running|coach|coaching|endurance|training)\b/.test(haystack)) score += 3;
  if (surname && domain.includes(surname)) score += 2;
  if (locationTokens.some((token) => haystack.includes(token))) score += 1;
  return score;
}

async function findWebsiteCandidates(profile) {
  const query = `\"${profile.name}\" running coach ${profile.location} -site:vdoto2.com -site:instagram.com -site:facebook.com`;
  try {
    const { text } = await requestText(`${readerPrefix}http://www.bing.com/search?q=${encodeURIComponent(query)}`, { timeout: 45_000 });
    return searchResults(text)
      .map((candidate) => ({ ...candidate, score: candidateScore(candidate, profile), method: "web-search" }))
      .filter((candidate) => candidate.score >= 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  } catch {
    return [];
  }
}

function locationParts(location) {
  return location.split(",").map((part) => part.trim()).filter(Boolean).filter((part, index, parts) => index === 0 || normalize(part) !== normalize(parts[index - 1]));
}

function verifyWebsite(profile, candidate, pages) {
  if (!pages?.length) return null;
  const combined = normalize(pages.map((page) => `${page.title} ${page.text}`).join(" "));
  if (combined.length < 250 || /domain (?:is )?for sale|buy this domain|page not found|404 not found/.test(combined.slice(0, 3_000))) return null;
  const tokens = significantNameTokens(profile.name);
  const nameMatch = tokens.length > 1 && tokens.every((token) => combined.includes(token));
  const surname = tokens.at(-1) || "";
  const hostMatch = surname.length > 3 && normalize(hostname(candidate.url)).includes(surname);
  const coachingMatch = /\bcoach(?:ing|es|ed)?\b/.test(combined) && /\b(run|runner|running|marathon|endurance|track|triathlon)\b/.test(combined);
  const places = locationParts(profile.location).map(normalize).filter((part) => part.length > 3);
  const locationMatch = places.some((place) => combined.includes(place));
  const searchIdentity = candidate.method === "web-search" && candidate.score >= 5;
  const directIdentity = candidate.method === "profile-link" || candidate.method === "reviewed-search";
  const accepted = coachingMatch && (directIdentity || (searchIdentity && (nameMatch || hostMatch))) && (directIdentity || nameMatch || (hostMatch && locationMatch));
  if (!accepted) return null;
  const evidence = [
    directIdentity ? "linked from the public coach profile or manually reviewed" : "found by an exact-name coaching search",
    nameMatch ? "coach name appears on the site" : hostMatch ? "coach surname appears in the site domain" : "profile supplies the identity link",
    "site describes running or endurance coaching",
    ...(locationMatch ? ["site and directory location agree"] : []),
  ];
  return { pages, evidence, confidence: "high" };
}

function inferCoach(profile, website) {
  const text = normalize(website.pages.map((page) => page.text).join(" "));
  const online = /\b(online|remote|virtual)\b/.test(text);
  const inPerson = /\b(in person|in-person|local coaching)\b/.test(text);
  const format = online && inPerson ? "hybrid" : inPerson && !online ? "in-person" : "online";
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
    [/\bboston qualif|\bbq\b/, "Boston qualifying"],
    [/\btriathlon|ironman|multisport\b/, "Triathlon"],
    [/\bmarathon\b/, "Marathon"],
    [/\bhalf marathon\b/, "Half marathon"],
    [/\b5k|10k\b/, "5K and 10K"],
  ];
  const specialties = specialtyRules.filter(([pattern]) => pattern.test(text)).map(([, label]) => label).slice(0, 5);
  if (specialties.length === 0) specialties.push("Individual running coaching");
  const location = profile.location || "Global";
  const city = cityBuckets.get(normalize(locationParts(location)[0])) || "Online";
  const formatPhrase = format === "hybrid" ? "online and in-person" : format === "in-person" ? "in-person" : "online";
  const specialtyPhrase = specialties.slice(0, 3).map((value) => value.toLowerCase()).join(", ").replace(/, ([^,]+)$/, " and $1");
  const blurb = `${profile.name} offers ${formatPhrase} running coaching with a focus on ${specialtyPhrase}.`;
  const sourceUrl = website.pages[0].url;
  return {
    slug: `coach-${profile.slug}`,
    name: profile.name,
    city,
    location,
    format,
    focus: [...new Set(focus)],
    specialties,
    blurb,
    bio: [`${profile.name} offers ${formatPhrase} coaching focused on ${specialtyPhrase}.`],
    link: sourceUrl,
    source: { name: hostname(sourceUrl), url: sourceUrl },
    discoveredFrom: { name: "V.O2 coach marketplace", url: profile.profileUrl },
    sourceCheckedAt: checkedAt,
    verified: false,
  };
}

async function enrichProfile(profile, index, total) {
  if (knownInvalidProfiles.has(profile.slug)) {
    return { profile, status: "invalid-profile", reason: "The live directory link returned a not-found page during the source audit." };
  }
  if (!profile.name) {
    return { profile, status: "review", reason: profile.discoveryError || "The public profile did not expose a usable coach name." };
  }

  const seeded = seededWebsiteLeads[profile.slug];
  const seen = new Set();
  const inspectCandidates = async (candidates) => {
    for (const candidate of candidates) {
      let normalizedUrl;
      try {
        const parsed = new URL(candidate.url);
        parsed.hash = "";
        normalizedUrl = parsed.href;
      } catch {
        continue;
      }
      const key = `${hostname(normalizedUrl)}${new URL(normalizedUrl).pathname.replace(/\/$/, "")}`;
      if (seen.has(key) || isBlockedWebsite(normalizedUrl)) continue;
      seen.add(key);
      const pages = await readWebsite(normalizedUrl);
      const verified = verifyWebsite(profile, { ...candidate, url: normalizedUrl }, pages);
      if (!verified) continue;
      const coach = inferCoach(profile, verified);
      console.log(`[${index + 1}/${total}] ${profile.name}: ${hostname(coach.link)}`);
      return {
        profile,
        status: "ready",
        coach,
        website: {
          url: coach.link,
          discoveryMethod: candidate.method,
          confidence: verified.confidence,
          checkedAt,
          evidence: verified.evidence,
          pages: verified.pages.map((page) => page.url),
        },
      };
    }
    return null;
  };

  if (seeded && !isBlockedWebsite(seeded[0])) {
    const seededMatch = await inspectCandidates([{ url: seeded[0], method: seeded[1], score: 10 }]);
    if (seededMatch) return seededMatch;
  }
  const searchedMatch = await inspectCandidates(await findWebsiteCandidates(profile));
  if (searchedMatch) return searchedMatch;
  console.log(`[${index + 1}/${total}] ${profile.name}: review`);
  return { profile, status: "review", reason: "No independently hosted coaching website could be matched with high confidence." };
}

function deduplicate(results) {
  const readyByPerson = new Map();
  for (const result of results) {
    if (result.status !== "ready") continue;
    const personKey = `${normalize(result.coach.name)}|${normalize(result.coach.location)}`;
    const duplicate = readyByPerson.get(personKey);
    if (duplicate) {
      result.status = "duplicate";
      result.reason = `Merged into ${duplicate.profile.profileUrl}.`;
      result.duplicateOf = duplicate.profile.slug;
      duplicate.alternateProfileUrls = [...(duplicate.alternateProfileUrls || []), result.profile.profileUrl];
      delete result.coach;
      delete result.website;
      continue;
    }
    readyByPerson.set(personKey, result);
  }

  const preferredTammy = results.find((result) => result.profile.slug === "tw-training");
  const duplicateTammy = results.find((result) => result.profile.slug === "coach-tammy");
  if (preferredTammy?.status === "ready" && duplicateTammy) {
    duplicateTammy.status = "duplicate";
    duplicateTammy.reason = `Merged into ${preferredTammy.profile.profileUrl}.`;
    duplicateTammy.duplicateOf = preferredTammy.profile.slug;
    preferredTammy.alternateProfileUrls = [
      ...(preferredTammy.alternateProfileUrls || []),
      duplicateTammy.profile.profileUrl,
    ];
    delete duplicateTammy.coach;
    delete duplicateTammy.website;
  }
  return results;
}

/*
 * Multiple coaches can legitimately work from the same business website, so
 * deduplication is intentionally based on normalized person + location rather
 * than domain. This merges the duplicate Tammy Whyte directory profiles while
 * retaining distinct coaches at shared organizations.
 */

function registryEntry(result) {
  const entry = {
    profileUrl: result.profile.profileUrl,
    slug: result.profile.slug,
    name: result.profile.name || null,
    location: result.profile.location || null,
    status: result.status,
  };
  if (result.website) entry.website = result.website;
  if (result.coach) {
    entry.coachSlug = result.coach.slug;
    entry.coach = result.coach;
  }
  if (result.reason) entry.reason = result.reason;
  if (result.duplicateOf) entry.duplicateOf = result.duplicateOf;
  if (result.alternateProfileUrls?.length) entry.alternateProfileUrls = result.alternateProfileUrls;
  return entry;
}

async function previousReadyProfiles() {
  try {
    const [registrySource, coachesSource] = await Promise.all([
      readFile(registryPath, "utf8"),
      readFile(coachesPath, "utf8"),
    ]);
    const registry = JSON.parse(registrySource);
    const coachJson = coachesSource.match(/VDOT_COACHES\s*=\s*([\s\S]*?)\s+satisfies\s+import/)?.[1];
    const coaches = coachJson ? JSON.parse(coachJson) : [];
    const coachesBySlug = new Map(coaches.map((coach) => [coach.slug, coach]));
    return new Map(
      registry
        .filter((entry) => entry.status === "ready" && entry.website?.checkedAt === checkedAt)
        .map((entry) => [entry.slug, { website: entry.website, coach: entry.coach || coachesBySlug.get(entry.coachSlug) }])
        .filter(([, value]) => value.coach),
    );
  } catch {
    return new Map();
  }
}

async function main() {
  const previousReady = await previousReadyProfiles();
  let profiles = await discoverProfiles();
  profiles.sort(
    (a, b) => Number(!a.name) - Number(!b.name) || a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug),
  );
  console.log(`Discovered ${profiles.length} current directory links.`);
  if (profiles.length !== 186) throw new Error(`Expected the audited live directory to contain 186 links, found ${profiles.length}.`);
  if (limit !== undefined) profiles = profiles.slice(0, limit);
  const freshResults = await mapConcurrent(profiles, async (profile, index) => {
    const result = await enrichProfile(profile, index, profiles.length);
    const previous = previousReady.get(profile.slug);
    if (result.status !== "ready" && previous && !isBlockedWebsite(previous.coach.link)) {
      console.log(`[${index + 1}/${profiles.length}] ${profile.name}: retained checked website`);
      return { profile, status: "ready", coach: previous.coach, website: previous.website };
    }
    return result;
  });
  const results = deduplicate(freshResults);
  const registry = results.map(registryEntry);
  const coaches = results.filter((result) => result.status === "ready").map((result) => result.coach).sort((a, b) => a.name.localeCompare(b.name));
  const counts = registry.reduce((summary, entry) => ({ ...summary, [entry.status]: (summary[entry.status] || 0) + 1 }), {});

  if (dryRun) {
    console.log(JSON.stringify({ checkedAt, counts, sample: coaches.slice(0, 3) }, null, 2));
    return;
  }
  const generated = `/* This file is generated by scripts/import-vdot-coaches.mjs. */\nexport const VDOT_COACHES = ${JSON.stringify(coaches, null, 2)} satisfies import(\"./coaches\").Coach[];\n`;
  await Promise.all([
    writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`),
    writeFile(coachesPath, generated),
  ]);
  console.log(`Stored ${coaches.length} website-confirmed coaches; registry status: ${JSON.stringify(counts)}.`);
}

await main();
