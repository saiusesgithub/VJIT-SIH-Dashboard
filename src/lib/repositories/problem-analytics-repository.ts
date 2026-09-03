import "server-only";
import { getDb } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { calculateProblemAnalytics } from "@/lib/problem-analytics";

export async function getProblemStatementAnalytics(requestedRoundId?: string) {
  await requireAdminSession();
  const db = getDb();
  const event = await db.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true } })
    ?? await db.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true } });
  if (!event) return { rows: [], rounds: [], selectedRoundId: "", maximum: 0 };
  const [records, roundRecords] = await Promise.all([
    db.problemStatement.findMany({ where: { hackathonId: event.id }, orderBy: { code: "asc" }, select: {
      id: true, code: true, title: true,
      teams: { where: { hackathonId: event.id }, select: { reviews: { where: { reviewRound: { hackathonId: event.id } }, select: { reviewRoundId: true, status: true, scores: { select: { score: true } } } } } },
    } }),
    db.reviewRound.findMany({ where: { hackathonId: event.id }, orderBy: { displayOrder: "asc" }, select: { id: true, roundNumber: true, name: true, rubrics: { select: { maxMarks: true } } } }),
  ]);
  const rounds = roundRecords.map((round) => ({ id: round.id, number: round.roundNumber, name: round.name, maximum: round.rubrics.reduce((sum, rubric) => sum + Math.round(rubric.maxMarks.toNumber() * 100), 0) / 100 }));
  const selectedRoundId = rounds.some((round) => round.id === requestedRoundId) ? requestedRoundId! : "";
  return {
    rounds, selectedRoundId,
    maximum: rounds.filter((round) => !selectedRoundId || round.id === selectedRoundId).reduce((sum, round) => sum + Math.round(round.maximum * 100), 0) / 100,
    rows: calculateProblemAnalytics(records.map((problem) => ({ ...problem, teams: problem.teams.map((team) => ({ reviews: team.reviews.map((review) => ({ roundId: review.reviewRoundId, status: review.status, scores: review.scores.map((score) => score.score.toNumber()) })) })) })), rounds, selectedRoundId || undefined),
  };
}
