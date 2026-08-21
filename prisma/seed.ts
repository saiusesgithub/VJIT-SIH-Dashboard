import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, ReviewStatus } from "../src/generated/prisma/client";
import { hackathon, judges, problemStatements, reviewRounds, reviews, rubrics, teams, venues } from "../src/data/mock/index";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DIRECT_URL (preferred) or DATABASE_URL before running the seed.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const statusMap = {
  pending: ReviewStatus.PENDING,
  in_progress: ReviewStatus.IN_PROGRESS,
  completed: ReviewStatus.COMPLETED,
} as const;

async function seed() {
  // The mock event uses stable IDs. Remove its dependent rows in an explicit
  // order so RESTRICT relations remain safe, without touching other events.
  await prisma.$transaction([
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
    await prisma.team.create({
      data: {
        id: team.id,
        hackathonId: hackathon.id,
        venueId: team.venueId,
        problemStatementId: team.problemStatementId,
        teamCode: team.code,
        teamName: team.name,
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
