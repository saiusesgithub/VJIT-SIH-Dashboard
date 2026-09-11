import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { parseLeaderboardExportOptions, selectLeaderboardExportEntries, type LeaderboardExportEntry } from "../src/lib/leaderboard-export";
import { createLeaderboardWorkbook } from "../src/lib/leaderboard-workbook";

const entry = (rank: number, decision: LeaderboardExportEntry["shortlisting"]["decision"], name = `Team ${rank}`): LeaderboardExportEntry => ({
  code: `T${String(rank).padStart(3, "0")}`, name, overallRank: rank, totalScore: 86, completedReviews: 3,
  venue: { name: "Lab 1", room: "A-201" }, problem: { code: "PS001", title: "Traffic management", theme: "Smart Automation", category: "Software" },
  shortlisting: { decision },
});

test("export options reject malformed and excessive limits", () => {
  assert.deepEqual(parseLeaderboardExportOptions(new URLSearchParams()), { scope: "ranked", limit: 25, theme: null });
  assert.deepEqual(parseLeaderboardExportOptions(new URLSearchParams("scope=shortlisted&limit=all&theme=Smart%20Automation")), { scope: "shortlisted", limit: null, theme: "Smart Automation" });
  for (const query of ["scope=private", "limit=0", "limit=-1", "limit=501", "limit=1.5", "limit=10extra"]) {
    assert.equal(parseLeaderboardExportOptions(new URLSearchParams(query)), null);
  }
});

test("selection supports top X ranked teams and faculty-shortlisted teams", () => {
  const entries = [entry(1, "SHORTLISTED"), entry(2, "HOLD"), entry(3, "SHORTLISTED"), { ...entry(4, null), overallRank: null }];
  assert.deepEqual(selectLeaderboardExportEntries(entries, { scope: "ranked", limit: 2, theme: null }).map((item) => item.code), ["T001", "T002"]);
  assert.deepEqual(selectLeaderboardExportEntries(entries, { scope: "shortlisted", limit: null, theme: "Smart Automation" }).map((item) => item.code), ["T001", "T003"]);
});

test("generated workbook is readable, styled, typed and formula-injection safe", async () => {
  const bytes = await createLeaderboardWorkbook({
    eventName: "VJIT SIH Internal Hackathon", roundCount: 3, maximumScore: 100, generatedAt: new Date("2026-08-21T10:27:00.000Z"),
    options: { scope: "ranked", limit: 10, theme: null }, entries: [entry(1, "SHORTLISTED", "=HYPERLINK(\"https://evil.example\")")],
  });
  assert.deepEqual([...bytes.subarray(0, 2)], [0x50, 0x4b]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  const sheet = workbook.getWorksheet("Selected teams")!;
  assert.equal(sheet.getCell("A1").value, "VJIT SIH Internal Hackathon");
  assert.equal(sheet.getCell("A6").value, 1);
  assert.equal(sheet.getCell("C6").value, "'=HYPERLINK(\"https://evil.example\")");
  assert.equal(sheet.getCell("D6").value, "Software");
  assert.equal(sheet.getCell("E6").value, "Smart Automation");
  assert.equal(sheet.getCell("J6").value, 86);
  assert.equal(sheet.getCell("K6").value, 0.86);
  assert.equal(sheet.getCell("M6").value, "Shortlisted");
  assert.ok(sheet.autoFilter);
});
