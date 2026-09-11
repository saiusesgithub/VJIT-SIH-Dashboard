import "dotenv/config";
import ExcelJS from "exceljs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, ShortlistingDecision } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before applying the final shortlist.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const shouldApply = process.argv.includes("--apply");
const workbookPath = process.argv.slice(2).find((value) => value !== "--apply");

function cellText(value: ExcelJS.CellValue | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value && value.result !== undefined) return String(value.result).trim();
  }
  return String(value).trim();
}

function normalizeTeamCode(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  const match = compact.match(/^([A-Z]{2})-?(\d{1,3})$/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}` : compact;
}

async function readShortlist(path: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in the shortlist workbook.");

  const codes: string[] = [];
  sheet.eachRow((row) => {
    const code = normalizeTeamCode(cellText(row.getCell(2).value));
    const decision = cellText(row.getCell(13).value).toLowerCase();
    if (code && /^[A-Z]{2}-\d{2,3}$/.test(code) && decision.includes("shortlisted")) codes.push(code);
  });
  const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
  if (duplicates.length) throw new Error(`Duplicate team IDs in spreadsheet: ${[...new Set(duplicates)].join(", ")}`);
  if (!codes.length) throw new Error("No shortlisted team IDs were found in column B.");
  return codes;
}

async function main() {
  if (!workbookPath) throw new Error("Usage: npm run db:final-ppt-shortlist -- <workbook-path> [--apply]");
  const selectedCodes = await readShortlist(workbookPath);
  const event = (await prisma.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" } }))
    ?? await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" } });
  if (!event) throw new Error("No hackathon event found.");

  const teams = await prisma.team.findMany({ where: { hackathonId: event.id }, select: { id: true, teamCode: true, teamName: true, finalDecision: true } });
  const teamByCode = new Map(teams.map((team) => [normalizeTeamCode(team.teamCode), team]));
  const missing = selectedCodes.filter((code) => !teamByCode.has(code));
  if (missing.length) throw new Error(`These shortlisted teams are not in the database: ${missing.join(", ")}`);
  const selectedIds = selectedCodes.map((code) => teamByCode.get(code)!.id);
  const preview = {
    mode: shouldApply ? "apply" : "dry-run",
    hackathon: event.name,
    eventTeamCount: teams.length,
    finalPptShortlistedCount: selectedCodes.length,
    disqualifiedCount: teams.length - selectedCodes.length,
    shortlistedTeamCodes: selectedCodes,
  };
  if (!shouldApply) {
    console.info(JSON.stringify(preview, null, 2));
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const shortlisted = await tx.team.updateMany({
      where: { hackathonId: event.id, id: { in: selectedIds }, OR: [{ finalDecision: null }, { finalDecision: { not: ShortlistingDecision.SHORTLISTED } }] },
      data: { finalDecision: ShortlistingDecision.SHORTLISTED, decisionUpdatedAt: now, decisionRevision: { increment: 1 } },
    });
    const disqualified = await tx.team.updateMany({
      where: { hackathonId: event.id, id: { notIn: selectedIds }, OR: [{ finalDecision: null }, { finalDecision: { not: ShortlistingDecision.ELIMINATED } }] },
      data: { finalDecision: ShortlistingDecision.ELIMINATED, decisionUpdatedAt: now, decisionRevision: { increment: 1 } },
    });
    return { shortlistedUpdated: shortlisted.count, disqualifiedUpdated: disqualified.count };
  }, { maxWait: 10_000, timeout: 120_000 });
  console.info(JSON.stringify({ ...preview, ...result }, null, 2));
}

main().catch((error) => { console.error("Final PPT shortlist update failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
