import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { createTeamAccessLookup, developmentTeamAccessCode, TEAM_ACCESS_BCRYPT_COST } from "../src/lib/team-access-credential";
import { encryptTeamAccessCode } from "../src/lib/team-access-encryption";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before seeding team codes.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const teams = await prisma.team.findMany({ orderBy: { teamCode: "asc" }, select: { id: true, teamCode: true } });
  if (!teams.length) throw new Error("No teams found. Run the main seed first.");
  for (const team of teams) {
    const code = developmentTeamAccessCode(team.teamCode);
    await prisma.team.update({
      where: { id: team.id },
      data: { accessCodeHash: await hash(code, TEAM_ACCESS_BCRYPT_COST), accessCodeLookup: createTeamAccessLookup(code), accessCodeEncrypted: encryptTeamAccessCode(code) },
    });
  }
  console.info(`Development access-code hashes updated for ${teams.length} teams.`);
}

main()
  .catch((error) => { console.error("Team access-code seed failed", error); process.exitCode = 1; })
  .finally(async () => prisma.$disconnect());
