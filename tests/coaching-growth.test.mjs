import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { activationQuery, reportWindow } from "../scripts/coaching-activation-report.mjs";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
function load(path) {
  const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; vm.runInNewContext(code, { exports, require }); return exports;
}
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

test("preview analytics accepts only enumerated public interaction values", () => {
  const { productEventParameters } = load("src/lib/product-events.ts");
  const safe = productEventParameters({ preview_role: "coach", preview_action: "workout", coaching_focus: "beginners", email: "private@example.com", athlete_id: "private", notes: "private", date: "2026-11-05" });
  assert.deepEqual(JSON.parse(JSON.stringify(safe)), { preview_role: "coach", preview_action: "workout", coaching_focus: "beginners" });
  assert.deepEqual(JSON.parse(JSON.stringify(productEventParameters({ preview_role: "private@example.com", preview_action: "sensitive-notes", coaching_focus: "unlisted" }))), {});
});

test("activation report validates dates and excludes unfinished observation windows", async () => {
  assert.throws(() => reportWindow("2026-02-30", "2026-03-05"));
  assert.throws(() => reportWindow("2026-11-05", "2026-11-05"));
  assert.throws(() => reportWindow("2026-10-01", "2026-12-01", new Date("2026-11-05")));
  const db = new PGlite();
  try {
    await db.exec(`CREATE TABLE marketplace_coaches(user_id text, status text, created_at timestamptz);
      CREATE TABLE training_entries(assigned_by text,kind text,created_at timestamptz);
      CREATE TABLE training_relationships(coach_id text,status text);
      INSERT INTO marketplace_coaches VALUES ('a','approved','2026-10-01'),('b','pending','2026-10-25'),('c','approved','2026-10-02'),('outside','approved','2026-09-01');
      INSERT INTO training_entries VALUES ('a','workout','2026-10-03'),('a','workout','2026-10-04'),('c','workout','2026-10-25'),('b','workout','2026-10-26'),('outside','workout','2026-09-03');
      INSERT INTO training_relationships VALUES ('a','active'),('a','active'),('c','revoked');`);
    const { rows: [counts] } = await db.query(activationQuery, reportWindow("2026-10-01", "2026-11-01"));
    assert.deepEqual(counts, { applications_created: 3, currently_approved: 2, applications_with_closed_14_day_window: 2, pending_14_day_window: 1, coaches_with_retained_assignment_within_14_days: 1, currently_connected_coaches: 1 });
  } finally { await db.close(); }
});

test("coaching focus lookup rejects inherited names and uses existing distance routes", () => {
  const { coachingFocusPage, coachingFocusPages } = load("src/lib/coaching-focus.ts");
  assert.equal(coachingFocusPage("constructor"), undefined);
  assert.equal(coachingFocusPage("unknown"), undefined);
  for (const page of Object.values(coachingFocusPages)) assert.ok(["5k", "10k", "half-marathon", "marathon", "ultra"].includes(page.planDistance));
});
