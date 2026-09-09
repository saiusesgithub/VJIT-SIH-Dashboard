import "dotenv/config";
import ExcelJS from "exceljs";
import { hash } from "bcryptjs";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, VenueJudgeRole } from "../src/generated/prisma/client";
import { normalizeJudgeName, normalizeJudgePhone } from "../src/lib/judge-credentials";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before importing judge credentials.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
const BCRYPT_ROUNDS = 12;

interface JudgeCredentialRow {
  rowNumber: number;
  name: string;
  phone: string;
  password: string;
  role: VenueJudgeRole;
}

function cellText(value: ExcelJS.CellValue | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text.trim();
  return String(value).trim();
}

async function readCredentials(workbookPath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("The credential workbook has no worksheet.");
  const credentials: JudgeCredentialRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const serial = Number(cellText(row.getCell(1).value));
    const name = cellText(row.getCell(2).value);
    const phone = normalizeJudgePhone(cellText(row.getCell(5).value));
    const password = cellText(row.getCell(6).value);
    if (!serial && !name && !phone && !password) return;
    if (!Number.isInteger(serial) || serial < 1 || !name || phone.length < 10 || !password) throw new Error(`Invalid judge credential row ${rowNumber}.`);
    credentials.push({ rowNumber, name, phone, password, role: serial <= 20 ? VenueJudgeRole.EXTERNAL : VenueJudgeRole.INTERNAL });
  });
  if (credentials.length !== 40) throw new Error(`Expected 40 judge credentials, found ${credentials.length}.`);
  return credentials;
}

async function main() {
  const workbookPath = process.argv[2];
  if (!workbookPath) throw new Error("Pass the local Judges_sih26.xlsx path as the first argument.");
  const credentials = await readCredentials(workbookPath);
  const judges = await prisma.judge.findMany({ select: { id: true, name: true, phone: true } });
  const byPhone = new Map(judges.filter((judge) => judge.phone).map((judge) => [normalizeJudgePhone(judge.phone!), judge]));
  const byName = new Map(judges.map((judge) => [normalizeJudgeName(judge.name), judge]));
  const unmatchedRows: number[] = [];
  let updated = 0;
  for (const credential of credentials) {
    const judge = byPhone.get(credential.phone) ?? byName.get(normalizeJudgeName(credential.name));
    if (!judge) {
      unmatchedRows.push(credential.rowNumber);
      continue;
    }
    await prisma.$transaction([
      prisma.judge.update({ where: { id: judge.id }, data: { phone: credential.phone, passwordHash: await hash(credential.password, BCRYPT_ROUNDS) } }),
      prisma.venueJudge.updateMany({ where: { judgeId: judge.id }, data: { role: credential.role } }),
    ]);
    updated += 1;
  }
  if (unmatchedRows.length) throw new Error(`Could not match database judges for worksheet rows: ${unmatchedRows.join(", ")}.`);
  console.info(JSON.stringify({ updated, external: credentials.filter((item) => item.role === VenueJudgeRole.EXTERNAL).length, internal: credentials.filter((item) => item.role === VenueJudgeRole.INTERNAL).length }));
}

main().catch((error) => { console.error("Judge credential import failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
