import assert from "node:assert/strict";
import test from "node:test";
import { createRegistrationSummary, getVenueIdForTeamCode, inferAcademicYear, normalizeProblemStatementCode, normalizeTeamCode, normalizeTeamCodeWithOCorrection } from "../src/data/seed/registration-import";

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

test("maps DM, FS, HC teams into their official physical venues", () => {
  // Disaster Management: lab-1 (DM-01 to DM-16), lab-2 (DM-17 to DM-32)
  assert.equal(getVenueIdForTeamCode("DM-01"), "lab-1");
  assert.equal(getVenueIdForTeamCode("DM-16"), "lab-1");
  assert.equal(getVenueIdForTeamCode("DM-17"), "lab-2");
  assert.equal(getVenueIdForTeamCode("DM-32"), "lab-2");
  // Fitness & Sports: venue-27 (FS-01 to FS-02)
  assert.equal(getVenueIdForTeamCode("FS-01"), "venue-27");
  assert.equal(getVenueIdForTeamCode("FS-02"), "venue-27");
  // Heritage & Culture: venue-26a (HC-01 to HC-06)
  assert.equal(getVenueIdForTeamCode("HC-01"), "venue-26a");
  assert.equal(getVenueIdForTeamCode("HC-05"), "venue-26a");
});

test("maps MH, RS, RD teams into their official physical venues", () => {
  // MedTech: lab-3 (MH-01 to MH-10), lab-4 (MH-11 to MH-21)
  assert.equal(getVenueIdForTeamCode("MH-01"), "lab-3");
  assert.equal(getVenueIdForTeamCode("MH-10"), "lab-3");
  assert.equal(getVenueIdForTeamCode("MH-11"), "lab-4");
  assert.equal(getVenueIdForTeamCode("MH-21"), "lab-4");
  // Renewable Energy: venue-26a (RS-01 to RS-03)
  assert.equal(getVenueIdForTeamCode("RS-01"), "venue-26a");
  assert.equal(getVenueIdForTeamCode("RS-03"), "venue-26a");
  // Robotics and Drones: venue-26a (RD-01 to RD-03)
  assert.equal(getVenueIdForTeamCode("RD-01"), "venue-26a");
  assert.equal(getVenueIdForTeamCode("RD-03"), "venue-26a");
});

test("normalizeTeamCode corrects letter-O / digit-0 typos in team IDs", () => {
  // Well-formed codes with vowel prefixes must not be corrupted
  assert.equal(normalizeTeamCode("TO01"), "TO-01");
  assert.equal(normalizeTeamCode("TO07"), "TO-07");
  // O-as-zero typos in the suffix are handled by normalizeTeamCodeWithOCorrection
  assert.equal(normalizeTeamCodeWithOCorrection("RSO1"), "RS-01");
  assert.equal(normalizeTeamCodeWithOCorrection("RSO2"), "RS-02");
  assert.equal(normalizeTeamCodeWithOCorrection("RDO1"), "RD-01");
  // Well-formed codes pass through unchanged
  assert.equal(normalizeTeamCodeWithOCorrection("TO01"), "TO-01");
  assert.equal(normalizeTeamCodeWithOCorrection("ST05"), "ST-05");
});

test("maps SA, SE, SV teams into their official physical venues", () => {
  // Smart Automation: venue-14 through venue-21
  assert.equal(getVenueIdForTeamCode("SA-01"), "venue-14");
  assert.equal(getVenueIdForTeamCode("SA-10"), "venue-14");
  assert.equal(getVenueIdForTeamCode("SA-11"), "venue-15");
  assert.equal(getVenueIdForTeamCode("SA-15"), "venue-15");
  assert.equal(getVenueIdForTeamCode("SA-16"), "venue-16");
  assert.equal(getVenueIdForTeamCode("SA-20"), "venue-16");
  assert.equal(getVenueIdForTeamCode("SA-21"), "venue-17");
  assert.equal(getVenueIdForTeamCode("SA-30"), "venue-17");
  assert.equal(getVenueIdForTeamCode("SA-31"), "venue-18");
  assert.equal(getVenueIdForTeamCode("SA-40"), "venue-18");
  assert.equal(getVenueIdForTeamCode("SA-41"), "venue-19");
  assert.equal(getVenueIdForTeamCode("SA-50"), "venue-19");
  assert.equal(getVenueIdForTeamCode("SA-51"), "venue-20");
  assert.equal(getVenueIdForTeamCode("SA-60"), "venue-20");
  assert.equal(getVenueIdForTeamCode("SA-61"), "venue-21");
  assert.equal(getVenueIdForTeamCode("SA-69"), "venue-21");
  // Smart Education: venue-09 through venue-11
  assert.equal(getVenueIdForTeamCode("SE-01"), "venue-09");
  assert.equal(getVenueIdForTeamCode("SE-09"), "venue-09");
  assert.equal(getVenueIdForTeamCode("SE-10"), "venue-10");
  assert.equal(getVenueIdForTeamCode("SE-18"), "venue-10");
  assert.equal(getVenueIdForTeamCode("SE-19"), "venue-11");
  assert.equal(getVenueIdForTeamCode("SE-27"), "venue-11");
  // Smart Vehicles: venue-27 (SV-01 to SV-04)
  assert.equal(getVenueIdForTeamCode("SV-01"), "venue-27");
  assert.equal(getVenueIdForTeamCode("SV-04"), "venue-27");
});

test("maps ST, TO, TL teams into their official physical venues", () => {
  // Space Technology: venue-29 (ST-01 to ST-12)
  assert.equal(getVenueIdForTeamCode("ST-01"), "venue-29");
  assert.equal(getVenueIdForTeamCode("ST-12"), "venue-29");
  // Tourism: venue-27 (TO-01 to TO-07)
  assert.equal(getVenueIdForTeamCode("TO-01"), "venue-27");
  assert.equal(getVenueIdForTeamCode("TO-07"), "venue-27");
  // Transportation & Logistics: venue-28 (TL-01 to TL-15)
  assert.equal(getVenueIdForTeamCode("TL-01"), "venue-28");
  assert.equal(getVenueIdForTeamCode("TL-15"), "venue-28");
});

test("maps TG and MI teams into their official physical venues", () => {
  // Toys and Games: venue-26a (TG-01 to TG-02)
  assert.equal(getVenueIdForTeamCode("TG-01"), "venue-26a");
  assert.equal(getVenueIdForTeamCode("TG-02"), "venue-26a");
  // Miscellaneous: venue-12 (MI-01 to MI-12), venue-13 (MI-13 to MI-26)
  assert.equal(getVenueIdForTeamCode("MI-01"), "venue-12");
  assert.equal(getVenueIdForTeamCode("MI-12"), "venue-12");
  assert.equal(getVenueIdForTeamCode("MI-13"), "venue-13");
  assert.equal(getVenueIdForTeamCode("MI-26"), "venue-13");
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
