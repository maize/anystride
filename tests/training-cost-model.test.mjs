import test from "node:test";
import assert from "node:assert/strict";
import { estimateTrainingCost } from "../scripts/training-cost-model.mjs";

test("cost model counts free users, retained history and database egress separately", () => {
  const base = estimateTrainingCost();
  const retained = estimateTrainingCost({ storedAthletes: 100000 });
  assert.ok(retained.total > base.total);
  assert.equal(retained.dynamicRequests, base.dynamicRequests);
  const largePayload = estimateTrainingCost({ databaseReadKB: 10000 });
  assert.ok(largePayload.database > base.database);
  assert.equal(largePayload.vercel, base.vercel);
  assert.equal(estimateTrainingCost({ activeAthletes: 0, storedAthletes: 0, publicPageViews: 0 }).perActiveAthlete, null);
});
test("CDN tier transitions and unknown upper tiers never imply unlimited free traffic", () => {
  const base = estimateTrainingCost();
  assert.equal(base.cdnTier, 0);
  assert.equal(estimateTrainingCost({ publicPageViews: 200000 }).cdnTier, 20);
  assert.equal(estimateTrainingCost({ publicPageViews: 20000000 }).total, null);
  assert.throws(() => estimateTrainingCost({ activeAthletes: -1 }));
  assert.throws(() => estimateTrainingCost({ activeAthletes: 10000 }));
  assert.throws(() => estimateTrainingCost({ calendarReadsPerAthlete: 10 }));
  assert.throws(() => estimateTrainingCost({ inventedRate: 1 }));
});
test("marginal compute, MAU and overage charges respond to the configured rates", () => {
  const cost = estimateTrainingCost({ activeAthletes: 200000, storedAthletes: 200000 });
  const noAuthCharge = estimateTrainingCost({ activeAthletes: 200000, storedAthletes: 200000, authPerMAU: 0 });
  assert.ok(Math.abs(cost.database - noAuthCharge.database - 325) < 1e-8);
  const extra = estimateTrainingCost({ databaseComputeExtra: 100, otherMonthlyCosts: 50 });
  assert.equal(extra.total - estimateTrainingCost().total, 150);
});

test("coaching and imports count batch requests, row work and both network transfers", () => {
  const base = estimateTrainingCost();
  const coaching = estimateTrainingCost({ activeCoaches: 10, importsPerAthlete: 40 });
  assert.equal(coaching.assignmentCopies, 4000);
  assert.equal(coaching.importCopies, 40000);
  assert.equal(coaching.collaborationRequests, 4600);
  assert.equal(coaching.dynamicRequests - base.dynamicRequests, 4600);
  assert.ok(coaching.databaseEgressGB > base.databaseEgressGB);
  assert.ok(coaching.browserGB > base.browserGB);
  const singleSaves = estimateTrainingCost({ activeCoaches: 10, importsPerAthlete: 40, athletesPerAssignmentRequest: 1, activitiesPerImportRequest: 1 });
  assert.ok(singleSaves.dynamicRequests > coaching.dynamicRequests);
  assert.equal(singleSaves.assignmentCopies, coaching.assignmentCopies);
  assert.equal(singleSaves.importCopies, coaching.importCopies);
  assert.throws(() => estimateTrainingCost({ athletesPerAssignmentRequest: 21 }));
  assert.throws(() => estimateTrainingCost({ activitiesPerImportRequest: 0 }));
});

test("plan traffic separates template fetches, compact assignments, write volume and retained templates", () => {
  const base = estimateTrainingCost({ activeCoaches: 10 });
  const plans = estimateTrainingCost({ activeCoaches: 10, planReadsPerCoach: 20, planSavesPerCoach: 5, planSummaryReadsPerCoach: 10, planPreviewsPerCoach: 2, planAssignmentsPerCoach: 2, workoutsPerPlanAssignment: 100 });
  assert.equal(plans.planRequests, 390); assert.equal(plans.planCopies, 2000);
  assert.equal(plans.dynamicRequests - base.dynamicRequests, 390);
  assert.ok(plans.databaseWriteGB > base.databaseWriteGB);
  assert.ok(plans.databaseEgressGB > base.databaseEgressGB);
  assert.ok(plans.browserGB > base.browserGB);
  const small = estimateTrainingCost({ activeCoaches: 10, planAssignmentsPerCoach: 2, workoutsPerPlanAssignment: 1 });
  const large = estimateTrainingCost({ activeCoaches: 10, planAssignmentsPerCoach: 2, workoutsPerPlanAssignment: 500 });
  assert.equal(small.browserGB, large.browserGB);
  assert.ok(large.databaseWriteGB > small.databaseWriteGB);
  assert.ok(large.vercelUsageBeforeCredit > small.vercelUsageBeforeCredit);
  assert.ok(estimateTrainingCost({ storedCoaches: 10000 }).storedGB > estimateTrainingCost().storedGB);
  assert.throws(() => estimateTrainingCost({ workoutsPerPlanAssignment: 501 }));
});

test('Strava estimates include cron, webhook traffic, ephemeral storage and developer subscription', () => {
  const baseline = estimateTrainingCost();
  const connected = estimateTrainingCost({ stravaAthletes: 10, stravaDeveloperSubscriptionMonthly: 8 });
  assert.equal(connected.stravaRequests, 4080);
  assert.equal(connected.stravaSyncs, 200);
  assert.equal(connected.stravaProviderCalls, 620);
  assert.equal(connected.stravaProviderGB, 0.186);
  const larger = estimateTrainingCost({ stravaAthletes: 10, stravaActivitiesCached: 1000 });
  assert.ok(larger.stravaProviderGB > connected.stravaProviderGB);
  assert.ok(larger.browserGB > connected.browserGB);
  assert.ok(larger.storedGB > connected.storedGB);
  assert.ok(connected.databaseWriteGB > baseline.databaseWriteGB);
  assert.ok(connected.databaseEgressGB > baseline.databaseEgressGB);
  assert.ok(connected.storedGB > baseline.storedGB);
  assert.ok(connected.total >= baseline.total + 8);
});

test('coach sharing adds bounded app traffic and consent storage without provider requests or activity copies', () => {
  const base=estimateTrainingCost({stravaAthletes:10,activeCoaches:2});
  const shared=estimateTrainingCost({stravaAthletes:10,activeCoaches:2,stravaCoachReadsPerCoach:100,stravaSharingChangesPerAthlete:2,stravaStoredGrantsPerAthlete:1});
  assert.equal(shared.stravaProviderCalls,base.stravaProviderCalls);
  assert.ok(shared.databaseWriteGB>base.databaseWriteGB);
  assert.equal(shared.dynamicRequests-base.dynamicRequests,220);
  assert.equal(shared.stravaCoachReads,200);
  assert.ok(shared.browserGB>base.browserGB);
  assert.ok(shared.databaseEgressGB>base.databaseEgressGB);
  assert.ok(Math.abs(shared.storedGB-base.storedGB-5120/1e9)<1e-12);
});

test('calendar matching scales app traffic and tiny links without more Strava requests',()=>{
  const base=estimateTrainingCost({stravaAthletes:10});
  const matched=estimateTrainingCost({stravaAthletes:10,stravaMatchChangesPerAthlete:20,stravaStoredMatchesPerAthlete:30});
  assert.equal(base.stravaCalendarReads,600);
  assert.equal(matched.dynamicRequests-base.dynamicRequests,200);
  assert.equal(matched.stravaProviderCalls,base.stravaProviderCalls);
  assert.ok(matched.databaseWriteGB>base.databaseWriteGB);
  assert.ok(matched.databaseEgressGB>base.databaseEgressGB);
  assert.ok(Math.abs(matched.storedGB-base.storedGB-300*512/1e9)<1e-12);
});
