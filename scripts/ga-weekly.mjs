#!/usr/bin/env node
/**
 * Pull last-7-days stats from Google Analytics 4 via the Data API (REST) and
 * print JSON. Used by the weekly review agent (see AGENT-SETUP.md).
 *
 * Auth: a Google service account with "Viewer" on the GA4 property. Provide its
 * key as either:
 *   - GA_SA_KEY        : the service-account JSON, inline (handy as a CI secret)
 *   - GOOGLE_APPLICATION_CREDENTIALS : path to the JSON key file
 * And the property:
 *   - GA_PROPERTY_ID   : numeric GA4 property id (e.g. 123456789)
 *
 * Usage:  node scripts/ga-weekly.mjs [days]   (default 7)
 */
import { readFileSync } from "node:fs";
import { JWT } from "google-auth-library";

const days = Number(process.argv[2] ?? 7);
const propertyId = process.env.GA_PROPERTY_ID;
if (!propertyId) {
  console.error("Missing GA_PROPERTY_ID");
  process.exit(1);
}

function loadCredentials() {
  if (process.env.GA_SA_KEY) return JSON.parse(process.env.GA_SA_KEY);
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) return JSON.parse(readFileSync(path, "utf8"));
  console.error("Provide GA_SA_KEY or GOOGLE_APPLICATION_CREDENTIALS");
  process.exit(1);
}

async function getToken() {
  const creds = loadCredentials();
  const client = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const { access_token } = await client.authorize();
  return access_token;
}

async function runReport(token, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    throw new Error(`GA Data API ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function rows(report) {
  const dims = (report.dimensionHeaders ?? []).map((d) => d.name);
  const mets = (report.metricHeaders ?? []).map((m) => m.name);
  return (report.rows ?? []).map((r) => {
    const o = {};
    dims.forEach((d, i) => (o[d] = r.dimensionValues[i].value));
    mets.forEach((m, i) => (o[m] = Number(r.metricValues[i].value)));
    return o;
  });
}

const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

const token = await getToken();

const byPage = await runReport(token, {
  dateRanges,
  dimensions: [{ name: "pagePath" }],
  metrics: [
    { name: "screenPageViews" },
    { name: "totalUsers" },
    { name: "engagementRate" },
    { name: "averageSessionDuration" },
  ],
  orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
  limit: 50,
});

const totals = await runReport(token, {
  dateRanges,
  metrics: [
    { name: "screenPageViews" },
    { name: "totalUsers" },
    { name: "sessions" },
    { name: "engagementRate" },
  ],
});

// Where users land first (good signal for which pages do acquisition work).
const landing = await runReport(token, {
  dateRanges,
  dimensions: [{ name: "landingPagePlusQueryString" }],
  metrics: [{ name: "sessions" }, { name: "engagementRate" }],
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  limit: 20,
});

console.log(
  JSON.stringify(
    {
      windowDays: days,
      generatedAt: new Date().toISOString(),
      totals: rows(totals)[0] ?? {},
      pages: rows(byPage),
      landingPages: rows(landing),
    },
    null,
    2,
  ),
);
