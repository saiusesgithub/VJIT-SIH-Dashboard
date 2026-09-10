import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createTeamAccessLookup, normalizeTeamAccessCode, TEAM_ACCESS_BCRYPT_COST } from "../src/lib/team-access-credential";
import { encryptTeamAccessCode } from "../src/lib/team-access-encryption-core";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database connection is required.");
const [teamCode, rawCode] = process.argv.slice(2);
if (!teamCode || !rawCode) throw new Error("Usage: tsx scripts/set-team-access-code.ts <team-code> <access-code>");
const accessCode = normalizeTeamAccessCode(rawCode);
if (!/^(?:SIH-[A-HJ-NP-Z2-9]{8}|[A-HJ-NP-Z2-9]{8,32})$/.test(accessCode)) throw new Error("Access code must use unambiguous uppercase characters, with an optional SIH- prefix.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const team = await prisma.team.findFirst({ where: { teamCode: teamCode.toUpperCase() }, select: { id: true } });
  if (!team) throw new Error(`Team ${teamCode} was not found.`);
  await prisma.team.update({ where: { id: team.id }, data: { accessCodeHash: await hash(accessCode, TEAM_ACCESS_BCRYPT_COST), accessCodeLookup: createTeamAccessLookup(accessCode), accessCodeEncrypted: encryptTeamAccessCode(accessCode) } });
  console.info(`Updated access code for ${teamCode.toUpperCase()}.`);
}
main().catch((error) => { console.error("Team access code update failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
