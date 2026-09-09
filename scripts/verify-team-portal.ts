import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { compare } from "bcryptjs";
import { PrismaClient, ReviewStatus } from "../src/generated/prisma/client";
import { createTeamAccessLookup } from "../src/lib/team-access-credential";
import { decryptTeamAccessCode } from "../src/lib/team-access-encryption-core";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("A database connection is required.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const event = await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) throw new Error("No hackathon found.");
  const teams = await prisma.team.findMany({ where: { hackathonId: event.id }, orderBy: { teamCode: "asc" }, select: { teamCode: true, accessCodeHash: true, accessCodeLookup: true, accessCodeEncrypted: true } });
  if (!teams.length || teams.some((team) => !team.accessCodeHash || !team.accessCodeLookup || !team.accessCodeEncrypted)) throw new Error("Expected teams with complete access credentials.");
  const first = teams[0];
  const code = decryptTeamAccessCode(first.accessCodeEncrypted);
  if (!code || !(await compare(code, first.accessCodeHash!)) || first.accessCodeHash === code || first.accessCodeLookup !== createTeamAccessLookup(code) || first.accessCodeEncrypted === code) throw new Error("Team credential verification failed.");
  const [rounds, submissions, announcements, issues] = await Promise.all([
    prisma.reviewRound.findMany({ where: { hackathonId: event.id }, orderBy: { displayOrder: "asc" }, select: { feedbackVisibleToTeams: true, reviews: { where: { status: ReviewStatus.COMPLETED }, select: { id: true } } } }),
    prisma.teamSubmission.count({ where: { team: { hackathonId: event.id } } }),
    prisma.announcement.count({ where: { hackathonId: event.id } }),
    prisma.teamIssue.count({ where: { team: { hackathonId: event.id } } }),
  ]);
  const totals = rounds.map((round) => round.reviews.length);
  if (totals.length !== 3 || totals.some((total) => total < 0 || total > teams.length)) throw new Error(`Invalid completed-review totals: ${totals.join(",")}`);
  if (totals.length !== 3 || !rounds[0]?.feedbackVisibleToTeams) throw new Error("Team portal verification failed.");
  console.info(JSON.stringify({ teams: teams.length, completedReviews: totals, submissions, announcements, issues, plaintextCodesStored: false, encryptedRecovery: true }));
}

main().catch((error) => { console.error("Team portal verification failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
