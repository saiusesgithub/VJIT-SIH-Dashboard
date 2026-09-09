import assert from "node:assert/strict";
import test from "node:test";
import { officialPlannedTeamCount, officialVenues, developmentPinForAssignment } from "../src/data/seed/event-configuration";
import { rubrics } from "../src/data/mock/rubrics";

test("official venue allocation matches the supplied workbook", () => {
  assert.equal(officialVenues.length, 30);
  assert.equal(officialPlannedTeamCount, 312);
  assert.equal(new Set(officialVenues.map((venue) => venue.id)).size, officialVenues.length);
  assert.equal(new Set(officialVenues.map((venue) => venue.code)).size, officialVenues.length);
  assert.deepEqual(officialVenues.map((venue) => venue.sourceSerial).filter((serial) => serial === 26), [26, 26]);
  assert.equal(officialVenues.filter((venue) => !venue.location).map((venue) => venue.roomNumber).join(","), "N-104");
  assert.ok(officialVenues.every((venue) => venue.theme && venue.judges.length && venue.coordinators.length));
});

test("development judge credentials are deterministic and unique per assignment", () => {
  const pins = officialVenues.flatMap((venue, venueIndex) =>
    venue.judges.map((judge, judgeIndex) => developmentPinForAssignment(venueIndex + 1, judgeIndex, judge)),
  );
  assert.equal(new Set(pins).size, pins.length);
  assert.equal(developmentPinForAssignment(1, 0, officialVenues[0].judges[0]), "1111");
  assert.equal(developmentPinForAssignment(4, 1, officialVenues[3].judges[1]), "4444");
});

test("every review round uses the official 100-mark evaluation form", () => {
  assert.equal(rubrics.length, 3);
  for (const rubric of rubrics) {
    assert.equal(rubric.criteria.length, 10);
    assert.equal(rubric.criteria.reduce((total, criterion) => total + criterion.maxScore, 0), 100);
  }
  assert.deepEqual(rubrics[0].criteria.map((criterion) => criterion.label), [
    "Novelty of the Idea",
    "Complexity",
    "Clarity and Details in the Prescribed Format",
    "Feasibility",
    "Practicability",
    "Sustainability",
    "Scale of Impact",
    "User Experience",
    "Potential for Future Work Progression",
    "Presentation",
  ]);
});
