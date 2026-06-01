import { JWT } from "google-auth-library";

/**
 * Google Analytics 4 Data API access for the weekly review.
 *
 * Credentials (set in Vercel env):
 *   - GA_SA_KEY      : the service-account JSON (inline). Required.
 *   - GA_PROPERTY_ID : numeric GA4 property id. Defaults to the anystride property.
 */

// GA4 *property* id (the `p…` part of the admin URL a396316665p539727341),
// not the account id. Env var overrides if needed.
const PROPERTY_ID = process.env.GA_PROPERTY_ID ?? "539727341";

export function isGaConfigured(): boolean {
  return Boolean(process.env.GA_SA_KEY);
}

interface SaKey {
  client_email: string;
  private_key: string;
}

async function getAccessToken(): Promise<string> {
  const raw = process.env.GA_SA_KEY;
  if (!raw) throw new Error("GA_SA_KEY is not set");
  const creds = JSON.parse(raw) as SaKey;
  const client = new JWT({
    email: creds.client_email,
    // Env-stored keys often have escaped newlines; normalize them.
    key: creds.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const { access_token } = await client.authorize();
  if (!access_token) throw new Error("Failed to obtain GA access token");
  return access_token;
}

type Report = {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[];
};

async function runReport(
  token: string,
  body: Record<string, unknown>,
): Promise<Report> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
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

function toRows(report: Report): Record<string, string | number>[] {
  const dims = (report.dimensionHeaders ?? []).map((d) => d.name);
  const mets = (report.metricHeaders ?? []).map((m) => m.name);
  return (report.rows ?? []).map((r) => {
    const o: Record<string, string | number> = {};
    dims.forEach((d, i) => (o[d] = r.dimensionValues[i].value));
    mets.forEach((m, i) => (o[m] = Number(r.metricValues[i].value)));
    return o;
  });
}

export interface WeeklyStats {
  windowDays: number;
  generatedAt: string;
  totals: Record<string, string | number>;
  leads: number;
  pages: Record<string, string | number>[];
  landingPages: Record<string, string | number>[];
}

export async function fetchWeekly(days = 7): Promise<WeeklyStats> {
  const token = await getAccessToken();
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: "today" }];

  const [byPage, totals, leads, landing] = await Promise.all([
    runReport(token, {
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
    }),
    runReport(token, {
      dateRanges,
      metrics: [
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "sessions" },
        { name: "engagementRate" },
      ],
    }),
    runReport(token, {
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          stringFilter: { value: "generate_lead" },
        },
      },
    }),
    runReport(token, {
      dateRanges,
      dimensions: [{ name: "landingPagePlusQueryString" }],
      metrics: [{ name: "sessions" }, { name: "engagementRate" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 20,
    }),
  ]);

  return {
    windowDays: days,
    generatedAt: new Date().toISOString(),
    totals: toRows(totals)[0] ?? {},
    leads: Number(toRows(leads)[0]?.eventCount ?? 0),
    pages: toRows(byPage),
    landingPages: toRows(landing),
  };
}
