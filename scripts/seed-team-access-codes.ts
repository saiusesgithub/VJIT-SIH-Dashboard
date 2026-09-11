import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createTeamAccessLookup, TEAM_ACCESS_BCRYPT_COST } from "../src/lib/team-access-credential";
import { encryptTeamAccessCode } from "../src/lib/team-access-encryption-core";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before seeding team codes.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const accessCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function stableTeamAccessCode(teamId: string) {
  const digest = createHash("sha256").update(`vjit-sih:team-access:${teamId}`).digest();
  let suffix = "";
  for (let index = 0; index < 8; index += 1) suffix += accessCodeAlphabet[digest[index] % accessCodeAlphabet.length];
  return `SIH-${suffix}`;
}

async function main() {
  const teams = await prisma.team.findMany({ orderBy: { teamCode: "asc" }, select: { id: true, teamCode: true } });
  if (!teams.length) throw new Error("No teams found. Run the main seed first.");
  for (const team of teams) {
    const code = stableTeamAccessCode(team.id);
    await prisma.team.update({
      where: { id: team.id },
      data: { accessCodeHash: await hash(code, TEAM_ACCESS_BCRYPT_COST), accessCodeLookup: createTeamAccessLookup(code), accessCodeEncrypted: encryptTeamAccessCode(code) },
    });
  }
  console.info(`Stable SIH access-code hashes updated for ${teams.length} teams.`);
}

main()
  .catch((error) => { console.error("Team access-code seed failed", error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
