import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { AnnouncementAudience, IssueCategory, IssueStatus, PrismaClient, SubmissionType } from "../src/generated/prisma/client";
import { createTeamAccessLookup, developmentTeamAccessCode, TEAM_ACCESS_BCRYPT_COST } from "../src/lib/team-access-credential";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("Set DATABASE_URL_UNPOOLED, DIRECT_URL, or DATABASE_URL before seeding the team portal.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

async function main() {
  const event = await prisma.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) throw new Error("No hackathon found. Run the main seed first.");
  const teams = await prisma.team.findMany({ where: { hackathonId: event.id }, orderBy: { teamCode: "asc" }, select: { id: true, teamCode: true } });
  if (!teams.length) throw new Error("No teams found. Run the main seed first.");

  for (const [index, team] of teams.entries()) {
    const code = developmentTeamAccessCode(team.teamCode);
    await prisma.team.update({ where: { id: team.id }, data: { accessCodeHash: await hash(code, TEAM_ACCESS_BCRYPT_COST), accessCodeLookup: createTeamAccessLookup(code) } });
    const links: Array<{ type: SubmissionType; url: string }> = [{ type: SubmissionType.GITHUB, url: `https://github.com/vjit-sih/${team.teamCode.toLowerCase()}` }];
    if (index % 2 === 0) links.push({ type: SubmissionType.PRESENTATION, url: `https://drive.google.com/example/${team.teamCode.toLowerCase()}` });
    if (index % 3 === 0) links.push({ type: SubmissionType.DEMO, url: `https://demo.example.com/${team.teamCode.toLowerCase()}` });
    for (const link of links) await prisma.teamSubmission.upsert({ where: { teamId_type: { teamId: team.id, type: link.type } }, create: { id: `${team.id}-${link.type.toLowerCase()}`, teamId: team.id, ...link }, update: { url: link.url } });
  }

  const firstRound = await prisma.reviewRound.findFirst({ where: { hackathonId: event.id }, orderBy: { displayOrder: "asc" }, select: { id: true } });
  if (firstRound) await prisma.reviewRound.update({ where: { id: firstRound.id }, data: { feedbackVisibleToTeams: true } });

  for (const item of [
    { id: "announcement-review-2", title: "Review 2 begins at 1:30 PM", message: "Keep your prototype and validation evidence ready before the review window begins.", audience: AnnouncementAudience.ALL, publishedAt: new Date("2026-08-21T12:30:00+05:30") },
    { id: "announcement-lab-1", venueId: "lab-1", title: "Lab 1 teams: remain ready", message: "Mentors will begin the next walkthrough from Team T001.", audience: AnnouncementAudience.VENUE, publishedAt: new Date("2026-08-21T12:45:00+05:30") },
    { id: "announcement-judges", title: "Judge coordination note", message: "Please submit each review before moving to the next team.", audience: AnnouncementAudience.JUDGES, publishedAt: new Date("2026-08-21T10:00:00+05:30") },
  ]) await prisma.announcement.upsert({ where: { id: item.id }, create: { ...item, hackathonId: event.id }, update: item });

  const team1 = teams.find((team) => team.teamCode === "T001");
  if (team1) await prisma.teamIssue.upsert({ where: { id: "issue-team-001-review" }, create: { id: "issue-team-001-review", teamId: team1.id, category: IssueCategory.REVIEW, title: "Review status not updated", description: "Our first review was completed but the portal still showed it in progress.", status: IssueStatus.IN_PROGRESS, adminResponse: "The review entry is being verified with the assigned judge." }, update: {} });
  console.info(`Team portal fixtures and development access hashes upserted for ${teams.length} teams without resetting evaluation data.`);
}

main().catch((error) => { console.error("Team portal seed failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
