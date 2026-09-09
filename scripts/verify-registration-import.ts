import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database connection is required.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const event = await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) throw new Error("No hackathon found.");
  const venueCodes = ["V05", "V06", "V07", "V08", "V22", "V23", "V24", "V25", "V27"];
  const [teams, placeholderTeams, credentials, venues] = await Promise.all([
    prisma.team.count({ where: { hackathonId: event.id } }),
    prisma.team.count({ where: { hackathonId: event.id, teamCode: { startsWith: "T" } } }),
    prisma.team.count({ where: { hackathonId: event.id, accessCodeHash: { not: null }, accessCodeLookup: { not: null }, accessCodeEncrypted: { not: null } } }),
    prisma.venue.findMany({ where: { hackathonId: event.id, code: { in: venueCodes } }, select: { code: true, roomNumber: true, _count: { select: { teams: true } } }, orderBy: { code: "asc" } }),
  ]);
  const actual = Object.fromEntries(venues.map((venue) => [venue.code, venue._count.teams]));
  const expected = { V05: 10, V06: 10, V07: 10, V08: 10, V22: 10, V23: 10, V24: 10, V25: 6, V27: 7 };
  if (placeholderTeams || credentials !== teams || Object.entries(expected).some(([code, count]) => actual[code] !== count)) throw new Error(`Registration import verification failed: ${JSON.stringify({ teams, placeholderTeams, credentials, actual })}`);
  console.info(JSON.stringify({ teams, placeholderTeams, credentials, venues: actual }));
}

main().catch((error) => { console.error("Registration verification failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
