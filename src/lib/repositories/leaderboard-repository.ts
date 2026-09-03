import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { calculateLeaderboard } from "@/lib/leaderboard";
import { hasCompletedReviewThree } from "@/lib/shortlisting";

export async function getFacultyLeaderboard() {
  // Authorize before any score query: layouts and pages may render in parallel.
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSessionToken(token))) redirect("/admin/login?returnTo=%2Fadmin%2Fleaderboard");

  const db = getDb();
  const event = await db.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true, name: true } })
    ?? await db.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true, name: true } });
  if (!event) return { event: null, entries: [], roundCount: 0, maximumScore: 0 };

  const [teams, rounds] = await Promise.all([
    db.team.findMany({
      where: { hackathonId: event.id },
      select: {
        id: true, teamCode: true, teamName: true,
        finalDecision: true, decisionRevision: true, decisionUpdatedAt: true,
        venue: { select: { id: true, name: true, roomNumber: true } },
        problemStatement: { select: { id: true, code: true, title: true } },
        reviews: {
          where: { status: "COMPLETED", reviewRound: { hackathonId: event.id } },
          select: { status: true, reviewRound: { select: { roundNumber: true } }, scores: { select: { score: true } } },
        },
      },
    }),
    db.reviewRound.findMany({ where: { hackathonId: event.id }, select: { rubrics: { select: { maxMarks: true } } } }),
  ]);

  return {
    event,
    roundCount: rounds.length,
    maximumScore: rounds.flatMap((round) => round.rubrics).reduce((sum, rubric) => sum + Math.round(rubric.maxMarks.toNumber() * 100), 0) / 100,
    entries: calculateLeaderboard(teams.map((team) => ({
      id: team.id, code: team.teamCode, name: team.teamName,
      venue: { id: team.venue.id, name: team.venue.name, room: team.venue.roomNumber },
      problem: team.problemStatement,
      reviews: team.reviews.map((review) => ({ status: review.status, scores: review.scores.map((score) => score.score.toNumber()) })),
    }))).map((entry) => {
      const team = teams.find((team) => team.id === entry.id)!;
      return { ...entry, shortlisting: { decision: team.finalDecision, revision: team.decisionRevision,
        updatedAt: team.decisionUpdatedAt?.toISOString() ?? null,
        eligible: hasCompletedReviewThree(team.reviews.map((review) => ({ status: review.status, roundNumber: review.reviewRound.roundNumber }))) } };
    }),
  };
}
