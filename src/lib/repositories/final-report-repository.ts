import "server-only";

import { ReviewStatus, ShortlistingDecision } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export interface FinalReportRound {
  id: string;
  number: number;
  name: string;
  criteria: Array<{ id: string; name: string; maxMarks: number }>;
  maximumScore: number;
}

export interface FinalReportRow {
  id: string;
  code: string;
  finalDecision: ShortlistingDecision | null;
  reviews: Map<string, { status: ReviewStatus; scores: Map<string, number> }>;
}

export async function getFinalReportData() {
  const db = getDb();
  const event = (await db.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true, name: true } }))
    ?? await db.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true, name: true } });
  if (!event) return null;

  const [rounds, teams] = await Promise.all([
    db.reviewRound.findMany({
      where: { hackathonId: event.id },
      include: { rubrics: { orderBy: { displayOrder: "asc" } } },
      orderBy: { displayOrder: "asc" },
    }),
    db.team.findMany({
      where: { hackathonId: event.id },
      include: {
        reviews: {
          include: { scores: true },
        },
      },
      orderBy: { teamCode: "asc" },
    }),
  ]);

  const reportRounds = rounds.map((round) => ({
    id: round.id,
    number: round.roundNumber,
    name: round.name,
    criteria: round.rubrics.map((rubric) => ({ id: rubric.id, name: rubric.name, maxMarks: rubric.maxMarks.toNumber() })),
    maximumScore: round.rubrics.reduce((sum, rubric) => sum + rubric.maxMarks.toNumber(), 0),
  }));

  return {
    eventName: event.name,
    rounds: reportRounds,
    teams: teams.map((team) => ({
      id: team.id,
      code: team.teamCode,
      finalDecision: team.finalDecision,
      reviews: new Map(team.reviews.map((review) => [review.reviewRoundId, {
        status: review.status,
        scores: new Map(review.scores.map((score) => [score.rubricId, score.score.toNumber()])),
      }])),
    } satisfies FinalReportRow)),
  };
}
