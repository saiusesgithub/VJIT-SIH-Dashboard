import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database connection is required.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const event = await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) throw new Error("No hackathon found.");
  // All venue codes that should have imported teams, updated after each batch.
  const venueCodes = [
    "V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08",
    "V09", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "V20", "V21",
    "V22", "V23", "V24", "V25", "V26A", "V27", "V28", "V29",
  ];
  const [teams, placeholderTeams, credentials, venues] = await Promise.all([
    prisma.team.count({ where: { hackathonId: event.id } }),
    // Placeholder teams from the original seed used IDs like "T001"–"T048" (teamCode startsWith "T0").
    prisma.team.count({ where: { hackathonId: event.id, teamCode: { startsWith: "T0" } } }),
    prisma.team.count({ where: { hackathonId: event.id, accessCodeHash: { not: null }, accessCodeLookup: { not: null }, accessCodeEncrypted: { not: null } } }),
    prisma.venue.findMany({ where: { hackathonId: event.id, code: { in: venueCodes } }, select: { code: true, roomNumber: true, _count: { select: { teams: true } } }, orderBy: { code: "asc" } }),
  ]);
  const actual = Object.fromEntries(venues.map((venue) => [venue.code, venue._count.teams]));
  // V01=lab-1 (DM-01–16), V02=lab-2 (DM-17–32), V03=lab-3 (MH-01–10), V04=lab-4 (MH-11–21)
  // V09–V11=SE, V12=MI-01–12, V13=MI-13–26, V14–V21=SA
  // V26A=HC×5+RS×3+RD×3+TG×2=13, V27=CG×7+FS×2+SV×4+TO×7=20, V28=TL×15, V29=ST×12
  const expected = {
    V01: 16, V02: 16, V03: 10, V04: 11,
    V05: 10, V06: 10, V07: 10, V08: 10,
    V09: 9, V10: 9, V11: 9,
    V12: 12, V13: 14,
    V14: 10, V15: 5, V16: 5, V17: 10, V18: 10, V19: 10, V20: 10, V21: 9,
    V22: 10, V23: 10, V24: 10, V25: 6,
    V26A: 13, V27: 20, V28: 15, V29: 12,
  };
  if (placeholderTeams || credentials !== teams || Object.entries(expected).some(([code, count]) => actual[code] !== count)) throw new Error(`Registration import verification failed: ${JSON.stringify({ teams, placeholderTeams, credentials, actual })}`);
  console.info(JSON.stringify({ teams, placeholderTeams, credentials, venues: actual }));
}

main().catch((error) => { console.error("Registration verification failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
