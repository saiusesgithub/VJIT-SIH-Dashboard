import assert from "node:assert/strict";
import test from "node:test";
import ExcelJS from "exceljs";
import { ReviewStatus, ShortlistingDecision } from "../src/generated/prisma/client";
import { createFinalReportWorkbook } from "../src/lib/final-report-workbook";

test("final report repeats each team across rounds and masks eliminated scores", async () => {
  const rounds = [1, 2, 3].map((number) => ({
    id: `round-${number}`,
    number,
    name: `Review ${number}`,
    criteria: [
      { id: `idea-${number}`, name: "Novelty of the Idea", maxMarks: 10 },
      { id: `presentation-${number}`, name: "Presentation", maxMarks: 10 },
    ],
    maximumScore: 20,
  }));
  const completedScores = (number: number) => new Map([[`idea-${number}`, 9], [`presentation-${number}`, 10]]);
  const buffer = await createFinalReportWorkbook({
    eventName: "VJIT SIH",
    rounds,
    generatedAt: new Date("2026-09-11T10:00:00.000Z"),
    teams: [
      { id: "team-1", code: "T001", finalDecision: null, reviews: new Map(rounds.map((round) => [round.id, { status: ReviewStatus.COMPLETED, scores: completedScores(round.number) }])) },
      { id: "team-2", code: "T002", finalDecision: ShortlistingDecision.ELIMINATED, reviews: new Map(rounds.map((round) => [round.id, { status: ReviewStatus.COMPLETED, scores: completedScores(round.number) }])) },
    ],
  });
  const workbook = new ExcelJS.Workbook();
  // ExcelJS's Buffer declaration predates Node's generic Buffer typing.
  await workbook.xlsx.load(Buffer.from(buffer) as never);
  const sheet = workbook.getWorksheet("Team report")!;
  assert.equal(sheet.getCell("D4").value, "Novelty of the Idea (10M)");
  assert.equal(sheet.getCell("F4").value, "Score / 20");
  assert.equal(sheet.getCell("G4").value, "Total score / 60");
  assert.equal(sheet.getCell("F5").value, 19);
  assert.equal(sheet.getCell("G5").value, 57);
  assert.equal(sheet.getCell("D8").value, "-");
  assert.equal(sheet.getCell("G8").value, "-");
  assert.equal(sheet.getCell("A6").master.address, "A5");
  assert.equal(sheet.getCell("G6").master.address, "G5");
});
