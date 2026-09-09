import assert from "node:assert/strict";
import test from "node:test";
import { createRegistrationSummary, getVenueIdForTeamCode, inferAcademicYear, normalizeProblemStatementCode, normalizeTeamCode } from "../src/data/seed/registration-import";

test("normalizes team and problem statement identifiers from registration sheets", () => {
  assert.equal(normalizeTeamCode("ar01"), "AR-01");
  assert.equal(normalizeTeamCode("BC 40"), "BC-40");
  assert.equal(normalizeProblemStatementCode("SIH 26131"), "SIH26131");
  assert.equal(normalizeProblemStatementCode("PS26190"), "SIH26190");
  assert.equal(normalizeProblemStatementCode("74"), "PS074");
});

test("maps the first batch into its official physical venues", () => {
  assert.equal(getVenueIdForTeamCode("AR-01"), "venue-22");
  assert.equal(getVenueIdForTeamCode("AR-36"), "venue-25");
  assert.equal(getVenueIdForTeamCode("BC-40"), "venue-08");
  assert.equal(getVenueIdForTeamCode("CG-07"), "venue-27");
});

test("summarizes registrations without losing venue assignments", () => {
  const summary = createRegistrationSummary([
    { teamCode: "AR-01", teamName: "A", theme: "Agriculture", category: "Software", ideaTitle: "A", leadName: "A", leadRollNumber: "23911A0001", leadDepartment: "CSE", leadPhone: "", leadEmail: "", problemStatementCode: "SIH26001" },
    { teamCode: "BC-11", teamName: "B", theme: "Blockchain", category: "Software", ideaTitle: "B", leadName: "B", leadRollNumber: "25911A0001", leadDepartment: "CSE", leadPhone: "", leadEmail: "", problemStatementCode: "SIH26002" },
  ]);
  assert.deepEqual(summary, { teamCount: 2, venueCounts: { "venue-22": 1, "venue-06": 1 }, themeCounts: { Agriculture: 1, Blockchain: 1 } });
  assert.equal(inferAcademicYear("23911A0001"), 4);
  assert.equal(inferAcademicYear("25911A0001"), 2);
});
