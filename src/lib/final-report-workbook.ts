import ExcelJS from "exceljs";
import { ShortlistingDecision } from "@/generated/prisma/client";
import type { FinalReportRound, FinalReportRow } from "@/lib/repositories/final-report-repository";

type DisplayScore = number | "-" | "";

function safeText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function scoreFor(team: FinalReportRow, round: FinalReportRound, criterionId: string): DisplayScore {
  if (team.finalDecision === ShortlistingDecision.ELIMINATED) return "-";
  const review = team.reviews.get(round.id);
  if (review?.status === "ABSENT") return "-";
  if (review?.status !== "COMPLETED") return "";
  return review.scores.get(criterionId) ?? "";
}

function roundTotalFor(team: FinalReportRow, round: FinalReportRound): DisplayScore {
  if (team.finalDecision === ShortlistingDecision.ELIMINATED) return "-";
  const review = team.reviews.get(round.id);
  if (review?.status === "ABSENT") return "-";
  if (review?.status !== "COMPLETED") return "";
  return round.criteria.reduce((sum, criterion) => sum + (review.scores.get(criterion.id) ?? 0), 0);
}

function totalFor(team: FinalReportRow, rounds: FinalReportRound[]): DisplayScore {
  if (team.finalDecision === ShortlistingDecision.ELIMINATED) return "-";
  const totals = rounds.map((round) => roundTotalFor(team, round));
  if (totals.some((total) => total === "")) return "";
  if (totals.some((total) => total === "-")) return "-";
  return totals.reduce<number>((sum, total) => sum + (total as number), 0);
}

export async function createFinalReportWorkbook(input: { eventName: string; rounds: FinalReportRound[]; teams: FinalReportRow[]; generatedAt: Date }) {
  const templateRound = input.rounds[0];
  const criteria = templateRound?.criteria ?? [];
  const rubricMaximum = templateRound?.maximumScore ?? 0;
  const grandMaximum = input.rounds.reduce((sum, round) => sum + round.maximumScore, 0);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VJIT SIH Evaluation System";
  workbook.created = input.generatedAt;
  workbook.modified = input.generatedAt;

  const sheet = workbook.addWorksheet("Team report", {
    properties: { defaultRowHeight: 20 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    views: [{ state: "frozen", ySplit: 4, showGridLines: false }],
  });

  const lastColumn = 3 + criteria.length + 2;
  const lastLetter = sheet.getColumn(lastColumn).letter;
  sheet.mergeCells(`A1:${lastLetter}1`);
  sheet.getCell("A1").value = safeText(input.eventName);
  sheet.getCell("A1").font = { name: "Arial", size: 15, bold: true, color: { argb: "FF18181B" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 27;
  sheet.mergeCells(`A2:${lastLetter}2`);
  sheet.getCell("A2").value = "Final evaluation report";
  sheet.getCell("A2").font = { name: "Arial", size: 10, color: { argb: "FF52525B" } };
  sheet.mergeCells(`A3:${lastLetter}3`);
  sheet.getCell("A3").value = "- = absent or eliminated. Blank cells indicate a review that has not been completed.";
  sheet.getCell("A3").font = { name: "Arial", size: 9, italic: true, color: { argb: "FF71717A" } };

  const headers = ["S.No.", "TEAM ID", "Review", ...criteria.map((criterion) => `${criterion.name} (${criterion.maxMarks}M)`), `Score / ${rubricMaximum}`, `Total score / ${grandMaximum}`];
  sheet.getRow(4).values = headers;
  sheet.getRow(4).height = 46;
  sheet.getRow(4).eachCell((cell) => {
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF18181B" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = { top: { style: "thin", color: { argb: "FF3F3F46" } }, right: { style: "thin", color: { argb: "FF3F3F46" } }, bottom: { style: "thin", color: { argb: "FF3F3F46" } } };
  });

  input.teams.forEach((team, teamIndex) => {
    const startRow = 5 + teamIndex * Math.max(input.rounds.length, 1);
    const endRow = startRow + Math.max(input.rounds.length, 1) - 1;
    for (const [roundIndex, round] of input.rounds.entries()) {
      const row = sheet.getRow(startRow + roundIndex);
      row.values = [teamIndex + 1, safeText(team.code), `R${round.number}`, ...criteria.map((criterion, criterionIndex) => scoreFor(team, round, round.criteria[criterionIndex]?.id ?? criterion.id)), roundTotalFor(team, round), totalFor(team, input.rounds)];
      row.height = 23;
      row.eachCell((cell) => {
        cell.font = { name: "Arial", size: 10, color: { argb: "FF27272A" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = { top: { style: "hair", color: { argb: "FFD4D4D8" } }, right: { style: "thin", color: { argb: "FFE4E4E7" } }, bottom: { style: "hair", color: { argb: "FFD4D4D8" } }, left: { style: "thin", color: { argb: "FFE4E4E7" } } };
      });
      row.getCell(2).numFmt = "@";
    }
    const totalCell = sheet.getCell(startRow, lastColumn);
    totalCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF18181B" } };
    totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
    totalCell.alignment = { horizontal: "center", vertical: "middle" };
    if (input.rounds.length > 1) {
      // Merge after writing the three review rows. ExcelJS clears merges when a
      // later `row.values` assignment touches a merged cell.
      sheet.mergeCells(startRow, 1, endRow, 1);
      sheet.mergeCells(startRow, 2, endRow, 2);
      sheet.mergeCells(startRow, lastColumn, endRow, lastColumn);
    }
  });

  [8, 16, 9, ...criteria.map(() => 18), 13, 16].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.autoFilter = { from: "A4", to: `${lastLetter}4` };
  sheet.headerFooter.oddFooter = "VJIT SIH Internal Hackathon · Final evaluation report";
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
