import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Planning assumptions, not measurements or a quote. Override with measured
// traffic and the actual provider bill. Rates checked 2026-10-17; see docs.
export const defaults = {
  activeAthletes: 1000, storedAthletes: 1000, pageLoadsPerAthlete: 20,
  calendarReadsPerAthlete: 60, writesPerAthlete: 40,
  activeCoaches: 0, rosterReadsPerCoach: 20, rosterResponseKB: 40,
  coachCalendarReadsPerCoach: 200, assignmentCopiesPerCoach: 400,
  athletesPerAssignmentRequest: 10, cpuMsPerAssignmentCopy: 10,
  planReadsPerCoach: 0, planSavesPerCoach: 0, planSummaryReadsPerCoach: 0,
  planPreviewsPerCoach: 0, planAssignmentsPerCoach: 0, workoutsPerPlanAssignment: 60,
  planResponseKB: 32, planSummaryKB: 16, planPreviewDatabaseKB: 48,
  storedCoaches: 0, storedPlansPerCoach: 10, storedAssignmentsPerCoach: 100,
  bytesPerStoredPlan: 32768, bytesPerStoredAssignment: 1024,
  importsPerAthlete: 0, activitiesPerImportRequest: 20,
  stravaAthletes: 0, stravaEventsPerAthlete: 20, stravaReadsPerAthlete: 20,
  stravaSyncsPerAthlete: 20, stravaActivitiesCached: 500, stravaFullSyncsPerAthlete: 7, stravaBytesPerActivity: 1024,
  stravaProviderResponseKB: 300, stravaExtraMemoryGBSecondsPerSync: 2,
  stravaDeveloperSubscriptionMonthly: 0,
  stravaCalendarReadsPerAthlete: 60, stravaMatchChangesPerAthlete: 0, stravaStoredMatchesPerAthlete: 0,
  stravaCoachReadsPerCoach: 0, stravaSharingReadsPerAthlete: 20,
  stravaSharingChangesPerAthlete: 0, stravaStoredGrantsPerAthlete: 0,
  publicPageViews: 10000, requestsPerPage: 8, pageKB: 250,
  calendarResponseKB: 24, mutationResponseKB: 2, databaseReadKB: 28,
  authResponseKB: 2, storedWorkoutsPerAthlete: 520, bytesPerStoredWorkout: 2048,
  cpuMsPerRequest: 25, memoryGBSecondsPerRequest: 0.3,
  vercelBase: 20, vercelUsageCredit: 20, invocationPerMillion: 0.60,
  cpuPerHour: 0.128, memoryPerGBHour: 0.0106, originTransferPerGB: 0.06,
  databaseAndAuthBase: 25, databaseComputeExtra: 0,
  includedDatabaseGB: 8, databasePerGB: 0.125,
  includedDatabaseEgressGB: 250, databaseEgressPerGB: 0.09,
  includedAuthMAU: 100000, authPerMAU: 0.00325,
  otherMonthlyCosts: 0,
};

export function estimateTrainingCost(overrides = {}) {
  for (const [key, value] of Object.entries(overrides)) {
    if (!(key in defaults) || typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error(`Invalid cost assumption: ${key}`);
  }
  const x = { ...defaults, ...overrides };
  if (x.storedAthletes < x.activeAthletes) throw new Error("Stored athletes must include all active athletes.");
  if (x.athletesPerAssignmentRequest < 1 || x.athletesPerAssignmentRequest > 20 || x.activitiesPerImportRequest < 1 || x.activitiesPerImportRequest > 20) throw new Error("Batch sizes must be between 1 and 20.");
  if (x.storedCoaches < x.activeCoaches && Object.hasOwn(overrides, "storedCoaches")) throw new Error("Stored coaches must include active coaches.");
  if (x.workoutsPerPlanAssignment < 1 || x.workoutsPerPlanAssignment > 500) throw new Error("Plan assignments contain between 1 and 500 workout copies.");
  const storedCoaches = Math.max(x.storedCoaches, x.activeCoaches);
  const planRequests = x.activeCoaches * (x.planReadsPerCoach + x.planSavesPerCoach + x.planSummaryReadsPerCoach + x.planPreviewsPerCoach + x.planAssignmentsPerCoach);
  const planCopies = x.activeCoaches * x.planAssignmentsPerCoach * x.workoutsPerPlanAssignment;
  const planBrowserKB = x.activeCoaches * ((x.planReadsPerCoach + x.planSavesPerCoach) * x.planResponseKB + x.planSummaryReadsPerCoach * x.planSummaryKB + (x.planPreviewsPerCoach + x.planAssignmentsPerCoach) * x.mutationResponseKB);
  const planDatabaseKB = x.activeCoaches * ((x.planReadsPerCoach + x.planSavesPerCoach + x.planAssignmentsPerCoach) * x.planResponseKB + x.planSummaryReadsPerCoach * x.planSummaryKB + x.planPreviewsPerCoach * x.planPreviewDatabaseKB);
  const rosterRequests = x.activeCoaches * x.rosterReadsPerCoach;
  const coachReads = x.activeCoaches * x.coachCalendarReadsPerCoach;
  const assignmentCopies = x.activeCoaches * x.assignmentCopiesPerCoach;
  const assignmentRequests = x.activeCoaches * Math.ceil(x.assignmentCopiesPerCoach / x.athletesPerAssignmentRequest);
  const importCopies = x.activeAthletes * x.importsPerAthlete;
  const importRequests = x.activeAthletes * Math.ceil(x.importsPerAthlete / x.activitiesPerImportRequest);
  const collaborationRequests = rosterRequests + coachReads + assignmentRequests + importRequests;
  const collaborationKB = rosterRequests * x.rosterResponseKB + coachReads * x.calendarResponseKB + assignmentRequests * x.mutationResponseKB + importCopies * x.mutationResponseKB;
  const pageLoads = x.activeAthletes * x.pageLoadsPerAthlete;
  // Initial server-rendered calendar is included in calendarReads, not fetched twice.
  if (x.calendarReadsPerAthlete < x.pageLoadsPerAthlete) throw new Error("Calendar reads must include page loads.");
  const reads = x.activeAthletes * x.calendarReadsPerAthlete;
  const writes = x.activeAthletes * x.writesPerAthlete;
  const stravaReads = x.stravaAthletes * x.stravaReadsPerAthlete;
  const stravaSyncs = x.stravaAthletes * x.stravaSyncsPerAthlete;
  const stravaCalendarReads = x.stravaAthletes * x.stravaCalendarReadsPerAthlete;
  const stravaMatchRequests = x.stravaAthletes * x.stravaMatchChangesPerAthlete;
  const stravaCoachReads = x.activeCoaches * x.stravaCoachReadsPerCoach;
  const stravaSharingRequests = x.stravaAthletes * (x.stravaSharingReadsPerAthlete + x.stravaSharingChangesPerAthlete);
  const stravaRequests = stravaCalendarReads + stravaMatchRequests + stravaCoachReads + stravaSharingRequests + stravaReads + x.stravaAthletes * x.stravaEventsPerAthlete + (x.stravaAthletes ? 30 * 24 * 4 : 0);
  const stravaSnapshotKB = x.stravaActivitiesCached * x.stravaBytesPerActivity / 1000;
  const stravaBrowserKB = stravaReads * stravaSnapshotKB + (stravaCalendarReads + stravaCoachReads) * (Math.min(50,x.stravaActivitiesCached) * x.stravaBytesPerActivity / 1000 + 1) + (stravaSharingRequests + stravaMatchRequests) * 2;
  // Initial history plus five-day revalidation; allow a final boundary page.
  const stravaHistoryPages = x.stravaAthletes * x.stravaFullSyncsPerAthlete * (Math.ceil(x.stravaActivitiesCached / 100) + 1);
  const stravaProviderCalls = stravaSyncs + stravaHistoryPages;
  const stravaProviderGB = stravaProviderCalls * x.stravaProviderResponseKB / 1e6;
  const dynamicRequests = reads + writes + collaborationRequests + planRequests + stravaRequests;
  const extraReads = reads - pageLoads;
  const cdnRequests = (pageLoads + x.publicPageViews) * x.requestsPerPage + extraReads + writes + collaborationRequests + planRequests + stravaRequests;
  // Decimal GB as a planning convention; update with billed units when calibrating.
  const browserGB = ((pageLoads + x.publicPageViews) * x.pageKB + extraReads * x.calendarResponseKB + writes * x.mutationResponseKB + collaborationKB + planBrowserKB + stravaBrowserKB) / 1e6;
  const originGB = (pageLoads * x.pageKB + extraReads * x.calendarResponseKB + writes * x.mutationResponseKB + collaborationKB + planBrowserKB + stravaBrowserKB) / 1e6;
  const databaseEgressGB = (reads * x.databaseReadKB + writes * x.mutationResponseKB + dynamicRequests * x.authResponseKB + rosterRequests * x.rosterResponseKB + coachReads * x.databaseReadKB + (assignmentCopies + importCopies) * x.mutationResponseKB + planDatabaseKB + stravaBrowserKB + stravaRequests * 8) / 1e6;
  // Expose writes sent to the database separately from its billed response egress.
  const databaseWriteGB = (x.stravaAthletes * (x.stravaSharingChangesPerAthlete + x.stravaMatchChangesPerAthlete) * 512 + (writes + assignmentCopies + importCopies + planCopies) * x.bytesPerStoredWorkout + x.activeCoaches * x.planSavesPerCoach * x.planResponseKB * 1000 + (stravaSyncs * Math.min(100, x.stravaActivitiesCached) + x.stravaAthletes * x.stravaFullSyncsPerAthlete * x.stravaActivitiesCached) * x.stravaBytesPerActivity) / 1e9;
  const storedGB = (x.storedAthletes * x.storedWorkoutsPerAthlete * x.bytesPerStoredWorkout + storedCoaches * (x.storedPlansPerCoach * x.bytesPerStoredPlan + x.storedAssignmentsPerCoach * x.bytesPerStoredAssignment) + x.stravaAthletes * (stravaSnapshotKB * 1000 + (x.stravaStoredGrantsPerAthlete + x.stravaStoredMatchesPerAthlete) * 512)) / 1e9;
  const tiers = [{ requests: 1e6, gb: 1000, price: 0 }, { requests: 1e7, gb: 50000, price: 20 }, { requests: 5e7, gb: 50000, price: 100 }, { requests: 1.5e8, gb: 50000, price: 300 }];
  const tier = tiers.find((tier) => cdnRequests <= tier.requests && browserGB <= tier.gb);
  const usage = dynamicRequests / 1e6 * x.invocationPerMillion
    + dynamicRequests * x.cpuMsPerRequest / 3600000 * x.cpuPerHour
    + (assignmentCopies + importCopies + planCopies) * x.cpuMsPerAssignmentCopy / 3600000 * x.cpuPerHour
    + dynamicRequests * x.memoryGBSecondsPerRequest / 3600 * x.memoryPerGBHour
    + stravaProviderCalls * x.stravaExtraMemoryGBSecondsPerSync / 3600 * x.memoryPerGBHour
    + originGB * x.originTransferPerGB;
  const database = x.databaseAndAuthBase + x.databaseComputeExtra
    + Math.max(0, storedGB - x.includedDatabaseGB) * x.databasePerGB
    + Math.max(0, databaseEgressGB - x.includedDatabaseEgressGB) * x.databaseEgressPerGB
    + Math.max(0, x.activeAthletes + x.activeCoaches - x.includedAuthMAU) * x.authPerMAU;
  const vercel = tier ? x.vercelBase + tier.price + Math.max(0, usage - x.vercelUsageCredit) : null;
  const total = vercel === null ? null : vercel + database + x.otherMonthlyCosts + (x.stravaAthletes ? x.stravaDeveloperSubscriptionMonthly : 0);
  return { assumptions: x, stravaCalendarReads, stravaMatchRequests, stravaCoachReads, stravaSharingRequests, stravaRequests, stravaSyncs, stravaHistoryPages, stravaProviderCalls, stravaProviderGB, planRequests, planCopies, databaseWriteGB, collaborationRequests, assignmentCopies, importCopies, dynamicRequests, cdnRequests, browserGB, originGB, databaseEgressGB, storedGB,
    vercelUsageBeforeCredit: usage, cdnTier: tier?.price ?? null, vercel, database, total,
    perActiveAthlete: total === null || !x.activeAthletes ? null : total / x.activeAthletes,
    warning: "Illustrative infrastructure subtotal only. Assumes Vercel Flat Rate CDN is enabled and one Supabase Pro project supplies database and auth. Not the verified production configuration. Excludes unconfigured email, payments, analytics, support, device APIs and database capacity upgrades. Strava estimates a 30-day billing month, year-long summaries, five-day history revalidation and a 15-minute cron; supply the actual developer subscription cost. Strava API quota/capacity approval is separate from infrastructure capacity. Tier unavailable => no total, not free traffic." };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], "utf8")) : {};
  if (process.argv[2]) console.log(JSON.stringify(estimateTrainingCost(config), null, 2));
  else {
    console.log("ILLUSTRATIVE SUBTOTALS — NOT BILL FORECASTS. Read docs/training-parity.md before using these values.");
    console.table([1000, 10000, 100000].map((activeAthletes) => {
      const result = estimateTrainingCost({ activeAthletes, storedAthletes: activeAthletes, publicPageViews: activeAthletes * 10 });
      return { athletes: activeAthletes, requests: result.cdnRequests, browserGB: result.browserGB.toFixed(1), databaseGB: result.databaseEgressGB.toFixed(1), storedGB: result.storedGB.toFixed(1), subtotalUSD: result.total?.toFixed(2), perAthleteUSD: result.perActiveAthlete?.toFixed(4) };
    }));
  }
}
