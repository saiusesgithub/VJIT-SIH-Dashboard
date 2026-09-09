import "dotenv/config";
import { randomInt } from "node:crypto";
import ExcelJS from "exceljs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createRegistrationSummary, getVenueIdForTeamCode, inferAcademicYear, normalizeProblemStatementCode, normalizeTeamCodeWithOCorrection, type RegistrationRow } from "../src/data/seed/registration-import";
import { createTeamAccessLookup, TEAM_ACCESS_BCRYPT_COST } from "../src/lib/team-access-credential";
import { encryptTeamAccessCode } from "../src/lib/team-access-encryption-core";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before importing registrations.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const shouldRemovePlaceholders = process.argv.includes("--remove-placeholders");
const workbookPaths = process.argv.slice(2).filter((value) => value !== "--remove-placeholders");
const accessCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function text(value: ExcelJS.CellValue | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value && value.result !== undefined) return String(value.result).trim();
    return String(value).trim();
  }
  return String(value).trim();
}

function cellAt(row: ExcelJS.Row, column: number) {
  return text(row.getCell(column).value);
}

function normalizeTitle(value: string) {
  return value.replace(/\uFFFD/g, "–").replace(/\s+/g, " ").trim();
}

function createAccessCode() {
  let code = "SIH-";
  for (let index = 0; index < 8; index += 1) code += accessCodeAlphabet[randomInt(accessCodeAlphabet.length)];
  return code;
}

async function loadRows(workbookPath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`No worksheet found in ${workbookPath}.`);
  const rows: RegistrationRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    const sourceTeamCode = cellAt(row, 3);
    if (!sourceTeamCode) return;
    rows.push({
      teamCode: normalizeTeamCodeWithOCorrection(sourceTeamCode), teamName: cellAt(row, 2), theme: cellAt(row, 4), category: cellAt(row, 5),
      ideaTitle: normalizeTitle(cellAt(row, 6)), leadName: cellAt(row, 7), leadRollNumber: cellAt(row, 8).toUpperCase(), leadDepartment: cellAt(row, 9),
      leadPhone: cellAt(row, 10), leadEmail: cellAt(row, 11).toLowerCase(), problemStatementCode: normalizeProblemStatementCode(cellAt(row, 12)),
    });
  });
  return rows;
}

function stableId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

async function ensureProblemStatement(eventId: string, row: RegistrationRow, venueId: string) {
  const existing = await prisma.problemStatement.findUnique({ where: { hackathonId_code: { hackathonId: eventId, code: row.problemStatementCode } }, select: { id: true } });
  const description = row.ideaTitle || "Problem-statement details will be updated from the official SIH source.";
  if (existing) {
    return prisma.problemStatement.update({ where: { id: existing.id }, data: { title: row.ideaTitle || row.problemStatementCode, description, theme: row.theme, category: row.category || null }, select: { id: true } });
  }
  return prisma.problemStatement.create({
    data: { id: stableId("problem", row.problemStatementCode), hackathonId: eventId, venueId, code: row.problemStatementCode, title: row.ideaTitle || row.problemStatementCode, description, theme: row.theme, category: row.category || null },
    select: { id: true },
  });
}

async function importTeam(eventId: string, row: RegistrationRow) {
  const venueId = getVenueIdForTeamCode(row.teamCode);
  const problemStatement = await ensureProblemStatement(eventId, row, venueId);
  const teamId = stableId("team", row.teamCode);
  const existing = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (existing) {
    await prisma.team.update({ where: { id: teamId }, data: { venueId, problemStatementId: problemStatement.id, teamCode: row.teamCode, teamName: row.teamName } });
  } else {
    const accessCode = createAccessCode();
    await prisma.team.create({
      data: {
        id: teamId, hackathonId: eventId, venueId, problemStatementId: problemStatement.id, teamCode: row.teamCode, teamName: row.teamName,
        accessCodeHash: await hash(accessCode, TEAM_ACCESS_BCRYPT_COST), accessCodeLookup: createTeamAccessLookup(accessCode), accessCodeEncrypted: encryptTeamAccessCode(accessCode),
      },
    });
  }
  await prisma.teamMember.upsert({
    where: { teamId_rollNumber: { teamId, rollNumber: row.leadRollNumber } },
    create: { id: `${teamId}-leader`, teamId, name: row.leadName, rollNumber: row.leadRollNumber, department: row.leadDepartment, year: inferAcademicYear(row.leadRollNumber), role: "Team Leader", email: row.leadEmail || null, phone: row.leadPhone || null },
    update: { name: row.leadName, department: row.leadDepartment, year: inferAcademicYear(row.leadRollNumber), role: "Team Leader", email: row.leadEmail || null, phone: row.leadPhone || null },
  });
}

async function removePlaceholderData(eventId: string) {
  const placeholderIds = Array.from({ length: 48 }, (_, index) => `team-${String(index + 1).padStart(3, "0")}`);
  const result = await prisma.team.deleteMany({ where: { hackathonId: eventId, id: { in: placeholderIds } } });
  await prisma.problemStatement.deleteMany({ where: { hackathonId: eventId, id: { in: Array.from({ length: 12 }, (_, index) => `ps-${String(index + 1).padStart(3, "0")}`) } } });
  return result.count;
}

async function main() {
  if (!workbookPaths.length) throw new Error("Pass one or more registration workbook paths. Add --remove-placeholders only for the initial live roster import.");
  const rows = (await Promise.all(workbookPaths.map(loadRows))).flat();
  const duplicates = rows.filter((row, index) => rows.findIndex((candidate) => candidate.teamCode === row.teamCode) !== index);
  if (duplicates.length) throw new Error(`Duplicate team IDs: ${[...new Set(duplicates.map((row) => row.teamCode))].join(", ")}`);
  const event = await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) throw new Error("No hackathon found. Run the base event seed first.");
  const removedPlaceholders = shouldRemovePlaceholders ? await removePlaceholderData(event.id) : 0;
  for (const row of rows) await importTeam(event.id, row);
  console.info(JSON.stringify({ ...createRegistrationSummary(rows), removedPlaceholders }));
}

main().catch((error) => { console.error("Registration import failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
