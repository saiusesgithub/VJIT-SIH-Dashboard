import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { hash } from "bcryptjs";
import { AnnouncementAudience, IssueCategory, IssueStatus, PrismaClient, ReviewStatus, SubmissionType } from "../src/generated/prisma/client";
import { hackathon, judges, problemStatements, reviewRounds, reviews, rubrics, teams, venues } from "../src/data/mock/index";
import { createJudgePinLookup, JUDGE_PIN_BCRYPT_COST } from "../src/lib/judge-pin-credential";
import { createTeamAccessLookup, developmentTeamAccessCode, TEAM_ACCESS_BCRYPT_COST } from "../src/lib/team-access-credential";
import { encryptTeamAccessCode } from "../src/lib/team-access-encryption";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DATABASE_URL_UNPOOLED (preferred), DIRECT_URL, or DATABASE_URL before running the seed.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const statusMap = {
  pending: ReviewStatus.PENDING,
  in_progress: ReviewStatus.IN_PROGRESS,
  completed: ReviewStatus.COMPLETED,
} as const;

const developmentJudgePins: Record<string, string> = {
  "lab-1": "1111",
  "lab-2": "2222",
  "lab-3": "3333",
  "lab-4": "4444",
};

async function seed() {
  // The mock event uses stable IDs. Remove its dependent rows in an explicit
  // order so RESTRICT relations remain safe, without touching other events.
  await prisma.$transaction([
    prisma.teamIssue.deleteMany({ where: { team: { hackathonId: hackathon.id } } }),
    prisma.teamSubmission.deleteMany({ where: { team: { hackathonId: hackathon.id } } }),
    prisma.announcement.deleteMany({ where: { hackathonId: hackathon.id } }),
    prisma.reviewScore.deleteMany({ where: { review: { team: { hackathonId: hackathon.id } } } }),
    prisma.review.deleteMany({ where: { team: { hackathonId: hackathon.id } } }),
    prisma.teamMember.deleteMany({ where: { team: { hackathonId: hackathon.id } } }),
    prisma.team.deleteMany({ where: { hackathonId: hackathon.id } }),
    prisma.rubric.deleteMany({ where: { reviewRound: { hackathonId: hackathon.id } } }),
    prisma.reviewRound.deleteMany({ where: { hackathonId: hackathon.id } }),
    prisma.problemStatement.deleteMany({ where: { hackathonId: hackathon.id } }),
    prisma.venueJudge.deleteMany({ where: { venue: { hackathonId: hackathon.id } } }),
    prisma.venue.deleteMany({ where: { hackathonId: hackathon.id } }),
    prisma.hackathon.deleteMany({ where: { id: hackathon.id } }),
  ]);

  await prisma.hackathon.create({
    data: {
      id: hackathon.id,
      name: hackathon.name,
      shortName: hackathon.shortName,
      academicYear: "2026–27",
      status: "LIVE",
      startDate: new Date(hackathon.date),
      endDate: new Date("2026-08-21T18:00:00+05:30"),
    },
  });

  await Promise.all(
    judges.map((judge) =>
      prisma.judge.upsert({
        where: { id: judge.id },
        update: {
          name: judge.name,
          designation: judge.designation,
          department: judge.department,
          phone: judge.contact,
        },
        create: {
          id: judge.id,
          name: judge.name,
          designation: judge.designation,
          department: judge.department,
          phone: judge.contact,
        },
      }),
    ),
  );

  for (const [index, venue] of venues.entries()) {
    const developmentPin = developmentJudgePins[venue.id];
    if (!developmentPin) throw new Error(`No development judge PIN configured for ${venue.id}`);

    await prisma.venue.create({
      data: {
        id: venue.id,
        hackathonId: hackathon.id,
        code: venue.name.replace(/\s+/g, "").toUpperCase(),
        name: venue.name,
        roomNumber: venue.room,
        building: venue.room.split("-")[0],
        displayOrder: index + 1,
      },
    });

    await prisma.venueJudge.create({
      data: {
        id: `${venue.id}-${venue.judgeId}`,
        venueId: venue.id,
        judgeId: venue.judgeId,
        isPrimary: true,
        pinHash: await hash(developmentPin, JUDGE_PIN_BCRYPT_COST),
        pinLookup: createJudgePinLookup(developmentPin),
      },
    });
  }

  for (const statement of problemStatements) {
    const venue = venues.find((candidate) => candidate.problemStatementIds.includes(statement.id));
    if (!venue) throw new Error(`No venue found for problem statement ${statement.id}`);

    await prisma.problemStatement.create({
      data: {
        id: statement.id,
        hackathonId: hackathon.id,
        venueId: venue.id,
        code: statement.code,
        title: statement.title,
        description: statement.description,
        organization: statement.organization,
        theme: statement.theme,
        category: statement.theme,
      },
    });
  }

  for (const [index, round] of reviewRounds.entries()) {
    await prisma.reviewRound.create({
      data: {
        id: round.id,
        hackathonId: hackathon.id,
        roundNumber: round.number,
        name: round.name,
        displayOrder: index + 1,
        feedbackVisibleToTeams: round.number === 1,
      },
    });

    const sourceRubric = rubrics.find((rubric) => rubric.id === round.rubricId);
    if (!sourceRubric) throw new Error(`No rubric found for review round ${round.id}`);

    for (const [criterionIndex, criterion] of sourceRubric.criteria.entries()) {
      await prisma.rubric.create({
        data: {
          id: `${round.id}-${criterion.id}`,
          reviewRoundId: round.id,
          name: criterion.label,
          maxMarks: criterion.maxScore,
          displayOrder: criterionIndex + 1,
        },
      });
    }
  }

  for (const team of teams) {
    const accessCode = developmentTeamAccessCode(team.code);
    await prisma.team.create({
      data: {
        id: team.id,
        hackathonId: hackathon.id,
        venueId: team.venueId,
        problemStatementId: team.problemStatementId,
        teamCode: team.code,
        teamName: team.name,
        accessCodeHash: await hash(accessCode, TEAM_ACCESS_BCRYPT_COST),
        accessCodeLookup: createTeamAccessLookup(accessCode),
        accessCodeEncrypted: encryptTeamAccessCode(accessCode),
        members: {
          create: team.members.map((member) => ({
            id: member.id,
            name: member.name,
            rollNumber: member.rollNumber,
            department: member.department,
            year: member.year,
            role: member.role,
          })),
        },
      },
    });
  }

  await prisma.teamSubmission.createMany({
    data: teams.flatMap((team, index) => {
      const rows: Array<{ id: string; teamId: string; type: SubmissionType; url: string }> = [{ id: `${team.id}-github`, teamId: team.id, type: SubmissionType.GITHUB, url: `https://github.com/vjit-sih/${team.code.toLowerCase()}` }];
      if (index % 2 === 0) rows.push({ id: `${team.id}-presentation`, teamId: team.id, type: SubmissionType.PRESENTATION, url: `https://drive.google.com/example/${team.code.toLowerCase()}` });
      if (index % 3 === 0) rows.push({ id: `${team.id}-demo`, teamId: team.id, type: SubmissionType.DEMO, url: `https://demo.example.com/${team.code.toLowerCase()}` });
      return rows;
    }),
  });

  await prisma.announcement.createMany({ data: [
    { id: "announcement-review-2", hackathonId: hackathon.id, title: "Review 2 begins at 1:30 PM", message: "Keep your prototype and validation evidence ready before the review window begins.", audience: AnnouncementAudience.ALL, publishedAt: new Date("2026-08-21T12:30:00+05:30") },
    { id: "announcement-lab-1", hackathonId: hackathon.id, venueId: "lab-1", title: "Lab 1 teams: remain ready", message: "Mentors will begin the next walkthrough from Team T001.", audience: AnnouncementAudience.VENUE, publishedAt: new Date("2026-08-21T12:45:00+05:30") },
    { id: "announcement-judges", hackathonId: hackathon.id, title: "Judge coordination note", message: "Please submit each review before moving to the next team.", audience: AnnouncementAudience.JUDGES, publishedAt: new Date("2026-08-21T10:00:00+05:30") },
  ] });

  await prisma.teamIssue.createMany({ data: [
    { id: "issue-team-001-review", teamId: "team-001", category: IssueCategory.REVIEW, title: "Review status not updated", description: "Our first review was completed but the portal still showed it in progress.", status: IssueStatus.IN_PROGRESS, adminResponse: "The review entry is being verified with the assigned judge.", createdAt: new Date("2026-08-21T11:42:00+05:30") },
    { id: "issue-team-014-submission", teamId: "team-014", category: IssueCategory.SUBMISSION, title: "Presentation link not opening", description: "The presentation link was updated and needs verification.", status: IssueStatus.RESOLVED, adminResponse: "The updated link is accessible now.", createdAt: new Date("2026-08-21T10:30:00+05:30"), resolvedAt: new Date("2026-08-21T10:48:00+05:30") },
  ] });

  for (const review of reviews) {
    const round = reviewRounds.find((candidate) => candidate.id === review.roundId);
    if (!round) throw new Error(`No review round found for review ${review.id}`);

    await prisma.review.create({
      data: {
        id: review.id,
        teamId: review.teamId,
        reviewRoundId: review.roundId,
        judgeId: review.judgeId,
        status: statusMap[review.status],
        startedAt: review.startedAt ? new Date(review.startedAt) : null,
        submittedAt: review.submittedAt ? new Date(review.submittedAt) : null,
        generalRemarks: review.remarks,
        improvements: review.improvements,
        scores: {
          create: review.scores.map((score) => ({
            id: `${review.id}-${score.criterionId}`,
            rubricId: `${round.id}-${score.criterionId}`,
            score: score.score,
          })),
        },
      },
    });
  }

  const [teamCount, statementCount, reviewCounts] = await Promise.all([
    prisma.team.count({ where: { hackathonId: hackathon.id } }),
    prisma.problemStatement.count({ where: { hackathonId: hackathon.id } }),
    prisma.review.groupBy({
      by: ["reviewRoundId"],
      where: { team: { hackathonId: hackathon.id }, status: ReviewStatus.COMPLETED },
      _count: { _all: true },
      orderBy: { reviewRoundId: "asc" },
    }),
  ]);

  console.info("Seed complete", {
    hackathons: 1,
    venues: venues.length,
    problemStatements: statementCount,
    teams: teamCount,
    completedReviews: reviewCounts.map((item) => ({ roundId: item.reviewRoundId, count: item._count._all })),
  });
}

seed()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
