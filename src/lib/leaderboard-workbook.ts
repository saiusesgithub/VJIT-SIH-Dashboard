import ExcelJS from "exceljs";
import { decisionLabels } from "@/lib/shortlisting";
import type { LeaderboardExportEntry, LeaderboardExportOptions } from "@/lib/leaderboard-export";

function safeText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function createLeaderboardWorkbook(input: {
  eventName: string;
  roundCount: number;
  generatedAt: Date;
  options: LeaderboardExportOptions;
  entries: LeaderboardExportEntry[];
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VJIT SIH Evaluation System";
  workbook.created = input.generatedAt;
  workbook.modified = input.generatedAt;
  const sheet = workbook.addWorksheet("Selected teams", {
    properties: { defaultRowHeight: 19 },
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
    views: [{ state: "frozen", ySplit: 5 }],
  });
  sheet.views = [{ state: "frozen", ySplit: 5, showGridLines: false }];
  sheet.mergeCells("A1:I1");
  sheet.getCell("A1").value = safeText(input.eventName);
  sheet.getCell("A1").font = { name: "Arial", size: 16, bold: true, color: { argb: "FF18181B" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells("A2:I2");
  const basis = input.options.scope === "shortlisted" ? "Faculty-shortlisted teams" : "Top-ranked teams";
  const count = input.options.limit === null ? "All" : `Top ${input.options.limit}`;
  sheet.getCell("A2").value = `${count} · ${basis}`;
  sheet.getCell("A2").font = { name: "Arial", size: 10, italic: true, color: { argb: "FF52525B" } };
  sheet.getCell("A4").value = "Generated at";
  sheet.getCell("B4").value = input.generatedAt;
  sheet.getCell("B4").numFmt = "dd mmm yyyy, hh:mm AM/PM";
  sheet.getRow(4).font = { name: "Arial", size: 9, color: { argb: "FF71717A" } };

  const headers = ["Overall rank", "Team ID", "Team name", "Problem code", "Problem statement", "Venue", "Room", "Review progress", "Final decision"];
  sheet.getRow(5).values = headers;
  sheet.getRow(5).height = 27;
  sheet.getRow(5).eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF18181B" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { right: { style: "thin", color: { argb: "FF3F3F46" } } };
  });
  for (const entry of input.entries) {
    sheet.addRow([
      entry.overallRank,
      safeText(entry.code),
      safeText(entry.name),
      safeText(entry.problem.code),
      safeText(entry.problem.title),
      safeText(entry.venue.name),
      safeText(entry.venue.room),
      `${entry.completedReviews} / ${input.roundCount}`,
      entry.shortlisting.decision ? decisionLabels[entry.shortlisting.decision] : "Not decided",
    ]);
  }
  const lastRow = Math.max(5, sheet.rowCount);
  sheet.autoFilter = { from: "A5", to: "I5" };
  for (let rowNumber = 6; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.font = { name: "Arial", size: 10, color: { argb: "FF27272A" } };
    row.alignment = { vertical: "middle" };
    row.eachCell((cell) => { cell.border = { bottom: { style: "hair", color: { argb: "FFE4E4E7" } } }; });
    row.getCell(1).numFmt = "0";
    row.getCell(1).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(5).alignment = { wrapText: true, vertical: "middle" };
    row.height = 28;
  }
  [12, 12, 24, 14, 38, 15, 12, 16, 17].forEach((width, index) => { sheet.getColumn(index + 1).width = width; });
  sheet.getColumn(2).numFmt = "@";
  sheet.getColumn(4).numFmt = "@";
  sheet.headerFooter.oddFooter = "VJIT SIH Internal Hackathon · Public team selection";
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
