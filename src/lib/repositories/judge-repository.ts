import "server-only";
import { compare } from "bcryptjs";
import { cache } from "react";
import { Prisma, ReviewStatus } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { createJudgePinLookup, DUMMY_JUDGE_PIN_HASH } from "@/lib/judge-pin-credential";
import type { JudgeSessionPayload } from "@/lib/judge-session";
import type { ReviewStatus as UiReviewStatus } from "@/types/domain";

const statusMap: Record<ReviewStatus, UiReviewStatus> = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

function safeId(value: string) {
  return /^[a-z0-9-]{1,64}$/i.test(value);
}

export interface JudgeIdentity {
  assignmentId: string;
  judgeId: string;
  venueId: string;
  judgeName: string;
  designation: string;
  department: string;
  venueName: string;
  roomNumber: string;
}

export interface JudgeTeamSummary {
  id: string;
  code: string;
  name: string;
  problemCode: string;
  problemTitle: string;
  reviews: Array<{ roundId: string; roundNumber: number; name: string; status: UiReviewStatus }>;
}

export interface JudgeDashboardData {
  identity: JudgeIdentity;
  problemRange: string;
  rounds: Array<{ id: string; number: number; name: string; completed: number; inProgress: number; total: number }>;
  teams: JudgeTeamSummary[];
}

export interface JudgeTeamData {
  id: string;
  code: string;
  name: string;
  problem: { code: string; title: string; description: string; organization: string; theme: string };
  members: Array<{ id: string; name: string; department: string; year: number; role: string }>;
  rounds: Array<{ id: string; number: number; name: string; status: UiReviewStatus; submittedAt?: string }>;
}

export interface JudgeReviewData {
  team: { id: string; code: string; name: string };
  round: { id: string; number: number; name: string };
  review: {
    id: string;
    status: UiReviewStatus;
    startedAt?: string;
    submittedAt?: string;
    remarks: string;
    improvements: string;
    scores: Record<string, number>;
  };
  rubrics: Array<{ id: string; name: string; description?: string; maxMarks: number }>;
}

const assignmentInclude = {
  judge: true,
  venue: { include: { hackathon: true } },
} satisfies Prisma.VenueJudgeInclude;

function mapIdentity(assignment: Prisma.VenueJudgeGetPayload<{ include: typeof assignmentInclude }>): JudgeIdentity {
  return {
    assignmentId: assignment.id,
    judgeId: assignment.judgeId,
    venueId: assignment.venueId,
    judgeName: assignment.judge.name,
    designation: assignment.judge.designation,
    department: assignment.judge.department,
    venueName: assignment.venue.name,
    roomNumber: assignment.venue.roomNumber,
  };
}

const findSessionAssignment = cache(async (assignmentId: string, judgeId: string, venueId: string) => {
  return getDb().venueJudge.findFirst({
    where: { id: assignmentId, judgeId, venueId, pinHash: { not: null } },
    include: assignmentInclude,
  });
});

function assignmentForSession(session: JudgeSessionPayload) {
  return findSessionAssignment(session.assignmentId, session.judgeId, session.venueId);
}

export async function authenticateJudgeByPin(pin: string): Promise<JudgeIdentity | null> {
  if (!pin || pin.length > 128) return null;
  const assignment = await getDb().venueJudge.findUnique({
    where: { pinLookup: createJudgePinLookup(pin) },
    include: assignmentInclude,
  });
  const matches = await compare(pin, assignment?.pinHash ?? DUMMY_JUDGE_PIN_HASH);
  return assignment && matches ? mapIdentity(assignment) : null;
}

export async function getJudgeSessionData(session: JudgeSessionPayload) {
  const assignment = await assignmentForSession(session);
  return assignment ? mapIdentity(assignment) : null;
}

export async function getJudgeDashboard(session: JudgeSessionPayload): Promise<JudgeDashboardData | null> {
  const assignment = await getDb().venueJudge.findFirst({
    where: {
      id: session.assignmentId,
      judgeId: session.judgeId,
      venueId: session.venueId,
      pinHash: { not: null },
    },
    include: {
      judge: true,
      venue: {
        include: {
          hackathon: { include: { reviewRounds: { orderBy: { displayOrder: "asc" } } } },
          teams: {
            include: { problemStatement: true, reviews: true },
            orderBy: { teamCode: "asc" },
          },
          problemStatements: { select: { code: true }, orderBy: { code: "asc" } },
        },
      },
    },
  });
  if (!assignment) return null;
  const rounds = assignment.venue.hackathon.reviewRounds;
  const teams = assignment.venue.teams;
  const statements = assignment.venue.problemStatements;
  const summaries = teams.map((team) => ({
    id: team.id,
    code: team.teamCode,
    name: team.teamName,
    problemCode: team.problemStatement.code,
    problemTitle: team.problemStatement.title,
    reviews: rounds.map((round) => {
      const review = team.reviews.find((candidate) => candidate.reviewRoundId === round.id);
      return { roundId: round.id, roundNumber: round.roundNumber, name: round.name, status: review ? statusMap[review.status] : "pending" as const };
    }),
  }));
  return {
    identity: mapIdentity(assignment),
    problemRange: statements.length ? `${statements[0].code}–${statements.at(-1)?.code}` : "No statements assigned",
    rounds: rounds.map((round) => {
      const reviews = teams.flatMap((team) => team.reviews.filter((review) => review.reviewRoundId === round.id));
      return {
        id: round.id,
        number: round.roundNumber,
        name: round.name,
        completed: reviews.filter((review) => review.status === ReviewStatus.COMPLETED).length,
        inProgress: reviews.filter((review) => review.status === ReviewStatus.IN_PROGRESS).length,
        total: teams.length,
      };
    }),
    teams: summaries,
  };
}

export async function getJudgeTeamDetails(session: JudgeSessionPayload, teamId: string): Promise<JudgeTeamData | null> {
  if (!safeId(teamId)) return null;
  const [assignment, team] = await Promise.all([
    assignmentForSession(session),
    getDb().team.findFirst({
      where: { venueId: session.venueId, OR: [{ id: teamId }, { teamCode: { equals: teamId, mode: "insensitive" } }] },
      include: {
        members: { orderBy: { id: "asc" } },
        problemStatement: true,
        reviews: { include: { reviewRound: true }, orderBy: { reviewRound: { displayOrder: "asc" } } },
        hackathon: { include: { reviewRounds: { orderBy: { displayOrder: "asc" } } } },
      },
    }),
  ]);
  if (!assignment || !team) return null;
  return {
    id: team.id,
    code: team.teamCode,
    name: team.teamName,
    problem: {
      code: team.problemStatement.code,
      title: team.problemStatement.title,
      description: team.problemStatement.description,
      organization: team.problemStatement.organization ?? "—",
      theme: team.problemStatement.theme ?? team.problemStatement.category ?? "—",
    },
    members: team.members.map((member) => ({ id: member.id, name: member.name, department: member.department, year: member.year, role: member.role ?? "Member" })),
    rounds: team.hackathon.reviewRounds.map((round) => {
      const review = team.reviews.find((candidate) => candidate.reviewRoundId === round.id);
      return { id: round.id, number: round.roundNumber, name: round.name, status: review ? statusMap[review.status] : "pending" as const, submittedAt: review?.submittedAt?.toISOString() };
    }),
  };
}

export async function getReviewForTeamRound(session: JudgeSessionPayload, teamId: string, roundId: string): Promise<JudgeReviewData | null> {
  if (!safeId(teamId) || !safeId(roundId)) return null;
  const [assignment, team] = await Promise.all([
    assignmentForSession(session),
    getDb().team.findFirst({
      where: { venueId: session.venueId, OR: [{ id: teamId }, { teamCode: { equals: teamId, mode: "insensitive" } }] },
      include: {
        reviews: { include: { scores: true } },
        hackathon: {
          include: {
            reviewRounds: {
              include: { rubrics: { orderBy: { displayOrder: "asc" } } },
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    }),
  ]);
  if (!assignment || !team) return null;
  const round = team.hackathon.reviewRounds.find((candidate) => candidate.id === roundId);
  if (!round) return null;
  const review = team.reviews.find((candidate) => candidate.reviewRoundId === round.id);
  return {
    team: { id: team.id, code: team.teamCode, name: team.teamName },
    round: { id: round.id, number: round.roundNumber, name: round.name },
    review: {
      id: review?.id ?? `review-${team.id}-${round.id}`,
      status: review ? statusMap[review.status] : "pending",
      startedAt: review?.startedAt?.toISOString(),
      submittedAt: review?.submittedAt?.toISOString(),
      remarks: review?.generalRemarks ?? "",
      improvements: review?.improvements ?? "",
      scores: Object.fromEntries((review?.scores ?? []).map((score) => [score.rubricId, score.score.toNumber()])),
    },
    rubrics: round.rubrics.map((rubric) => ({ id: rubric.id, name: rubric.name, description: rubric.description ?? undefined, maxMarks: rubric.maxMarks.toNumber() })),
  };
}

export async function startReview(session: JudgeSessionPayload, teamId: string, roundId: string) {
  if (!safeId(teamId) || !safeId(roundId)) return null;
  return getDb().$transaction(async (tx) => {
    const assignment = await tx.venueJudge.findFirst({ where: { id: session.assignmentId, judgeId: session.judgeId, venueId: session.venueId, pinHash: { not: null } } });
    const team = await tx.team.findFirst({ where: { id: teamId, venueId: session.venueId }, select: { id: true, hackathonId: true } });
    if (!assignment || !team) return null;
    const round = await tx.reviewRound.findFirst({ where: { id: roundId, hackathonId: team.hackathonId }, select: { id: true } });
    if (!round) return null;
    const review = await tx.review.upsert({
      where: { teamId_reviewRoundId: { teamId, reviewRoundId: roundId } },
      create: { id: `review-${teamId}-${roundId}`, teamId, reviewRoundId: roundId, judgeId: session.judgeId, status: ReviewStatus.IN_PROGRESS, startedAt: new Date() },
      update: {},
    });
    if (review.status === ReviewStatus.PENDING) {
      return tx.review.update({ where: { id: review.id }, data: { status: ReviewStatus.IN_PROGRESS, startedAt: review.startedAt ?? new Date(), judgeId: session.judgeId } });
    }
    return review;
  });
}

export interface ReviewSubmission {
  scores: Array<{ rubricId: string; score: number }>;
  remarks: string;
  improvements: string;
}

function sameCompletedReview(review: { generalRemarks: string | null; improvements: string | null; scores: Array<{ rubricId: string; score: { toNumber(): number } }> }, submission: ReviewSubmission) {
  if ((review.generalRemarks ?? "") !== submission.remarks.trim() || (review.improvements ?? "") !== submission.improvements.trim()) return false;
  if (review.scores.length !== submission.scores.length) return false;
  return submission.scores.every((score) => review.scores.some((current) => current.rubricId === score.rubricId && current.score.toNumber() === score.score));
}

export async function submitReview(session: JudgeSessionPayload, teamId: string, roundId: string, submission: ReviewSubmission) {
  if (!safeId(teamId) || !safeId(roundId) || submission.remarks.length > 5000 || submission.improvements.length > 5000) {
    return { ok: false as const, code: "invalid" as const };
  }
  return getDb().$transaction(async (tx) => {
    const [assignment, team] = await Promise.all([
      tx.venueJudge.findFirst({ where: { id: session.assignmentId, judgeId: session.judgeId, venueId: session.venueId, pinHash: { not: null } }, select: { id: true } }),
      tx.team.findFirst({ where: { id: teamId, venueId: session.venueId }, select: { id: true, hackathonId: true } }),
    ]);
    if (!assignment || !team) return { ok: false as const, code: "not_found" as const };
    const round = await tx.reviewRound.findFirst({ where: { id: roundId, hackathonId: team.hackathonId }, include: { rubrics: true } });
    if (!round) return { ok: false as const, code: "not_found" as const };
    const unique = new Map(submission.scores.map((score) => [score.rubricId, score.score]));
    if (unique.size !== submission.scores.length || unique.size !== round.rubrics.length) return { ok: false as const, code: "invalid" as const };
    for (const rubric of round.rubrics) {
      const value = unique.get(rubric.id);
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > rubric.maxMarks.toNumber()) return { ok: false as const, code: "invalid" as const };
    }
    const review = await tx.review.upsert({
      where: { teamId_reviewRoundId: { teamId, reviewRoundId: roundId } },
      create: { id: `review-${teamId}-${roundId}`, teamId, reviewRoundId: roundId, judgeId: session.judgeId, status: ReviewStatus.IN_PROGRESS, startedAt: new Date() },
      update: {},
      include: { scores: true },
    });
    if (review.status === ReviewStatus.COMPLETED) {
      return sameCompletedReview(review, submission)
        ? { ok: true as const, total: review.scores.reduce((sum, score) => sum + score.score.toNumber(), 0), alreadySubmitted: true }
        : { ok: false as const, code: "locked" as const };
    }
    const claimed = await tx.review.updateMany({ where: { id: review.id, status: { not: ReviewStatus.COMPLETED } }, data: { judgeId: session.judgeId, startedAt: review.startedAt ?? new Date() } });
    if (claimed.count !== 1) return { ok: false as const, code: "locked" as const };
    for (const rubric of round.rubrics) {
      const score = unique.get(rubric.id)!;
      await tx.reviewScore.upsert({
        where: { reviewId_rubricId: { reviewId: review.id, rubricId: rubric.id } },
        create: { id: `${review.id}-${rubric.id}`, reviewId: review.id, rubricId: rubric.id, score },
        update: { score },
      });
    }
    await tx.review.update({
      where: { id: review.id },
      data: { status: ReviewStatus.COMPLETED, judgeId: session.judgeId, submittedAt: new Date(), generalRemarks: submission.remarks.trim() || null, improvements: submission.improvements.trim() || null },
    });
    return { ok: true as const, total: round.rubrics.reduce((sum, rubric) => sum + unique.get(rubric.id)!, 0), alreadySubmitted: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
