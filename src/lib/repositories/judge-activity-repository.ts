import "server-only";

import { ReviewStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

async function getCurrentHackathon() {
  const db = getDb();
  return (await db.hackathon.findFirst({ where: { status: "LIVE" }, orderBy: { startDate: "desc" }, select: { id: true, name: true } }))
    ?? db.hackathon.findFirst({ orderBy: { startDate: "desc" }, select: { id: true, name: true } });
}

export interface JudgeActivityListItem {
  id: string;
  name: string;
  designation: string;
  department: string;
  phone: string | null;
  venueAssignments: Array<{ id: string; name: string; room: string; role: "EXTERNAL" | "INTERNAL" }>;
  completedReviewCount: number;
  evaluatedTeamCount: number;
}

export async function getJudgeActivityList() {
  const event = await getCurrentHackathon();
  if (!event) return { event: null, judges: [] satisfies JudgeActivityListItem[] };

  const judges = await getDb().judge.findMany({
    include: {
      venueAssignments: {
        where: { venue: { hackathonId: event.id } },
        include: { venue: { select: { id: true, name: true, roomNumber: true } } },
        orderBy: [{ isPrimary: "desc" }, { venue: { displayOrder: "asc" } }],
      },
      reviewsCompleted: {
        where: { status: ReviewStatus.COMPLETED, team: { hackathonId: event.id } },
        select: { teamId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return {
    event,
    judges: judges.map((judge) => ({
      id: judge.id,
      name: judge.name,
      designation: judge.designation,
      department: judge.department,
      phone: judge.phone,
      venueAssignments: judge.venueAssignments.map((assignment) => ({
        id: assignment.venue.id,
        name: assignment.venue.name,
        room: assignment.venue.roomNumber,
        role: assignment.role,
      })),
      completedReviewCount: judge.reviewsCompleted.length,
      evaluatedTeamCount: new Set(judge.reviewsCompleted.map((review) => review.teamId)).size,
    })),
  };
}

export async function getJudgeActivityDetail(judgeId: string) {
  if (!/^[a-z0-9-]{1,128}$/i.test(judgeId)) return null;
  const event = await getCurrentHackathon();
  if (!event) return null;

  const judge = await getDb().judge.findUnique({
    where: { id: judgeId },
    include: {
      venueAssignments: {
        where: { venue: { hackathonId: event.id } },
        include: { venue: { select: { id: true, name: true, roomNumber: true } } },
        orderBy: [{ isPrimary: "desc" }, { venue: { displayOrder: "asc" } }],
      },
      reviewsCompleted: {
        where: { status: ReviewStatus.COMPLETED, team: { hackathonId: event.id } },
        include: {
          team: {
            select: {
              id: true,
              teamCode: true,
              teamName: true,
              venue: { select: { name: true, roomNumber: true } },
              problemStatement: { select: { code: true, title: true } },
            },
          },
          reviewRound: { select: { id: true, roundNumber: true, name: true, displayOrder: true } },
          scores: { select: { score: true } },
        },
        orderBy: [{ submittedAt: "desc" }, { reviewRound: { displayOrder: "asc" } }],
      },
    },
  });
  if (!judge) return null;

  const teams = new Map<string, {
    id: string;
    code: string;
    name: string;
    venue: { name: string; room: string };
    problem: { code: string; title: string };
    reviews: Array<{ id: string; roundNumber: number; roundName: string; totalScore: number; submittedAt: string | null }>;
  }>();

  for (const review of judge.reviewsCompleted) {
    const current = teams.get(review.team.id) ?? {
      id: review.team.id,
      code: review.team.teamCode,
      name: review.team.teamName,
      venue: { name: review.team.venue.name, room: review.team.venue.roomNumber },
      problem: { code: review.team.problemStatement.code, title: review.team.problemStatement.title },
      reviews: [],
    };
    current.reviews.push({
      id: review.id,
      roundNumber: review.reviewRound.roundNumber,
      roundName: review.reviewRound.name,
      totalScore: review.scores.reduce((sum, score) => sum + score.score.toNumber(), 0),
      submittedAt: review.submittedAt?.toISOString() ?? null,
    });
    teams.set(review.team.id, current);
  }

  return {
    event,
    judge: {
      id: judge.id,
      name: judge.name,
      designation: judge.designation,
      department: judge.department,
      phone: judge.phone,
      venueAssignments: judge.venueAssignments.map((assignment) => ({
        id: assignment.venue.id,
        name: assignment.venue.name,
        room: assignment.venue.roomNumber,
        role: assignment.role,
      })),
    },
    teams: [...teams.values()].sort((left, right) => left.code.localeCompare(right.code, "en", { numeric: true })),
  };
}
